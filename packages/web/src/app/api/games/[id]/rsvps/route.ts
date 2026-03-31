import { createClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** GET /api/games/:id/rsvps — 出欠一覧 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rsvps")
    .select("*, members(name, tier, positions_json)")
    .eq("game_id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}

/** POST /api/games/:id/rsvps — 出欠依頼作成（全メンバー分） */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("team_id")
    .eq("id", id)
    .single();

  if (gameError) {
    return NextResponse.json({ error: gameError.message }, { status: 404 });
  }

  const { data: members, error: memberError } = await supabase
    .from("members")
    .select("id")
    .eq("team_id", game.team_id)
    .eq("status", "ACTIVE");

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 400 });
  }

  if (!members || members.length === 0) {
    return NextResponse.json(
      { error: "アクティブなメンバーがいません" },
      { status: 422 },
    );
  }

  const rows = members.map((m) => ({
    game_id: id,
    member_id: m.id,
    response: "NO_RESPONSE",
  }));

  const { data, error } = await supabase
    .from("rsvps")
    .upsert(rows, { onConflict: "game_id,member_id" })
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await writeAuditLog(supabase, {
    actor_type: "SYSTEM",
    actor_id: "SYSTEM",
    action: "REQUEST_RSVPS",
    target_type: "game",
    target_id: id,
    after_json: { member_count: members.length },
  });

  return NextResponse.json({
    created: data?.length ?? 0,
    total_members: members.length,
  });
}
