import { createServerClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** POST /api/grounds/watch-targets — 監視対象グラウンド登録 */
export async function POST(request: NextRequest) {
  const supabase = createServerClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("ground_watch_targets")
    .insert({
      team_id: body.team_id,
      name: body.name,
      source_url: body.source_url,
      area: body.area,
      conditions_json: body.conditions ?? null,
      active: true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await writeAuditLog(supabase, {
    actor_type: "USER",
    actor_id: body.team_id,
    action: "CREATE_GROUND_WATCH",
    target_type: "ground_watch_target",
    target_id: data.id,
    after_json: data,
  });

  return NextResponse.json(data, { status: 201 });
}

/** GET /api/grounds/watch-targets?team_id=xxx */
export async function GET(request: NextRequest) {
  const supabase = createServerClient();
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get("team_id");

  let query = supabase
    .from("ground_watch_targets")
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
