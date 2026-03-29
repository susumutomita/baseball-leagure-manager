import { createServerClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@match-engine/core";
import { canConfirm } from "@match-engine/core";
import { assertTransition } from "@match-engine/core";
import type { MatchRequestStatus } from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** POST /api/match-requests/:id/confirm — 試合確定 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServerClient();
  const body = await request.json();

  // MatchRequest取得
  const { data: mr, error: mrError } = await supabase
    .from("match_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (mrError) {
    return NextResponse.json({ error: mrError.message }, { status: 404 });
  }

  // 状態遷移チェック
  try {
    assertTransition(mr.status as MatchRequestStatus, "CONFIRMED");
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 422 });
  }

  // 交渉・出欠データを取得
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

  // Governor チェック
  const governorResult = canConfirm({
    matchRequest: mr,
    negotiations: negotiationsRes.data ?? [],
    availabilities: availabilitiesRes.data ?? [],
    memberCount: membersRes.data?.length ?? 0,
    minPlayers: body.min_players ?? 9,
    hasGround: body.has_ground ?? false,
  });

  if (!governorResult.allowed) {
    return NextResponse.json(
      {
        error: "確定条件を満たしていません",
        reasons: governorResult.reasons,
      },
      { status: 422 },
    );
  }

  // 確定処理
  const { data, error } = await supabase
    .from("match_requests")
    .update({ status: "CONFIRMED" })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // 確定レコード作成
  await supabase.from("confirmations").insert({
    match_request_id: id,
    approved_by: body.approved_by ?? "SYSTEM",
    status: "APPROVED",
    note: body.note ?? null,
  });

  await writeAuditLog(supabase, {
    actor_type: "USER",
    actor_id: body.approved_by ?? "SYSTEM",
    action: "CONFIRM_MATCH_REQUEST",
    target_type: "match_request",
    target_id: id,
    before_json: { status: mr.status },
    after_json: { status: "CONFIRMED" },
  });

  return NextResponse.json(data);
}
