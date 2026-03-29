import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { assertTransition } from "@/lib/state-machine";
import { writeAuditLog } from "@/lib/audit";
import type { MatchRequestStatus } from "@/types/domain";

/** POST /api/negotiations — 交渉作成 */
export async function POST(request: NextRequest) {
  const supabase = createServerClient();
  const body = await request.json();

  // MatchRequest の状態を確認・遷移
  const { data: mr, error: mrError } = await supabase
    .from("match_requests")
    .select("*")
    .eq("id", body.match_request_id)
    .single();

  if (mrError) {
    return NextResponse.json({ error: mrError.message }, { status: 404 });
  }

  // OPEN or MATCH_CANDIDATE_FOUND → NEGOTIATING へ遷移
  if (
    mr.status === "OPEN" ||
    mr.status === "MATCH_CANDIDATE_FOUND"
  ) {
    try {
      assertTransition(mr.status as MatchRequestStatus, "NEGOTIATING");
    } catch (e) {
      return NextResponse.json(
        { error: (e as Error).message },
        { status: 422 },
      );
    }

    await supabase
      .from("match_requests")
      .update({ status: "NEGOTIATING" })
      .eq("id", body.match_request_id);
  }

  const { data, error } = await supabase
    .from("negotiations")
    .insert({
      match_request_id: body.match_request_id,
      opponent_team_id: body.opponent_team_id,
      proposed_dates_json: body.proposed_dates ?? [],
      generated_message: body.message ?? null,
      status: "NOT_SENT",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await writeAuditLog(supabase, {
    actor_type: "USER",
    actor_id: mr.team_id,
    action: "CREATE_NEGOTIATION",
    target_type: "negotiation",
    target_id: data.id,
    after_json: data,
  });

  return NextResponse.json(data, { status: 201 });
}

/** GET /api/negotiations?match_request_id=xxx */
export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const { searchParams } = new URL(request.url);
  const matchRequestId = searchParams.get("match_request_id");

  let query = supabase
    .from("negotiations")
    .select("*, opponent_teams(*)")
    .order("created_at", { ascending: false });

  if (matchRequestId) {
    query = query.eq("match_request_id", matchRequestId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
