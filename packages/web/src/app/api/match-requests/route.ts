import { createServerClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** POST /api/match-requests — 試合リクエスト作成 */
export async function POST(request: NextRequest) {
  const supabase = createServerClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("match_requests")
    .insert({
      team_id: body.team_id,
      title: body.title,
      desired_dates_json: body.desired_dates ?? [],
      preferred_time_slots_json: body.preferred_time_slots ?? [],
      area: body.area,
      level_requirement: body.level_requirement ?? null,
      needs_ground: body.needs_ground ?? true,
      budget_limit: body.budget_limit ?? null,
      status: "DRAFT",
      confidence_score: 0,
      review_required: false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await writeAuditLog(supabase, {
    actor_type: "USER",
    actor_id: body.team_id,
    action: "CREATE_MATCH_REQUEST",
    target_type: "match_request",
    target_id: data.id,
    after_json: data,
  });

  return NextResponse.json(data, { status: 201 });
}

/** GET /api/match-requests — 試合リクエスト一覧 */
export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get("team_id");

  let query = supabase
    .from("match_requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (teamId) {
    query = query.eq("team_id", teamId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
