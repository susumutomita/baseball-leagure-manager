import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import {
  canConfirm,
  checkStopConditions,
  calculateConfidence,
} from "@/lib/governor";

/** POST /api/match-requests/:id/validate — 成立可能性チェック */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServerClient();
  const body = await request.json();

  const { data: mr, error: mrError } = await supabase
    .from("match_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (mrError) {
    return NextResponse.json({ error: mrError.message }, { status: 404 });
  }

  const [negotiationsRes, availabilitiesRes, membersRes] = await Promise.all([
    supabase.from("negotiations").select("*").eq("match_request_id", id),
    supabase
      .from("availability_responses")
      .select("*")
      .eq("match_request_id", id),
    supabase
      .from("members")
      .select("id")
      .eq("team_id", mr.team_id)
      .eq("status", "ACTIVE"),
  ]);

  const ctx = {
    matchRequest: mr,
    negotiations: negotiationsRes.data ?? [],
    availabilities: availabilitiesRes.data ?? [],
    memberCount: membersRes.data?.length ?? 0,
    minPlayers: body.min_players ?? 9,
    hasGround: body.has_ground ?? false,
  };

  const confirmCheck = canConfirm(ctx);
  const stopConditions = checkStopConditions(ctx);
  const confidence = calculateConfidence(ctx);

  // 信頼度スコアを更新
  await supabase
    .from("match_requests")
    .update({
      confidence_score: confidence,
      review_required: confirmCheck.reviewRequired,
    })
    .eq("id", id);

  return NextResponse.json({
    canConfirm: confirmCheck.allowed,
    reasons: confirmCheck.reasons,
    reviewRequired: confirmCheck.reviewRequired,
    stopConditions,
    confidenceScore: confidence,
  });
}
