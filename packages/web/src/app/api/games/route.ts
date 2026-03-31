import { createClient } from "@/lib/supabase/server";
import { createGameSchema } from "@/lib/validations";
import { writeAuditLog } from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** POST /api/games — 試合作成 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  const parsed = createGameSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("games")
    .insert({
      team_id: parsed.data.team_id,
      title: parsed.data.title,
      game_type: parsed.data.game_type,
      game_date: parsed.data.game_date ?? null,
      start_time: parsed.data.start_time ?? null,
      ground_name: parsed.data.ground_name ?? null,
      min_players: parsed.data.min_players,
      note: parsed.data.note ?? null,
      status: "DRAFT",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await writeAuditLog(supabase, {
    actor_type: "USER",
    actor_id: parsed.data.team_id,
    action: "CREATE_GAME",
    target_type: "game",
    target_id: data.id,
    after_json: data,
  });

  return NextResponse.json(data, { status: 201 });
}

/** GET /api/games?team_id=xxx&cursor=xxx&limit=20 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get("team_id");
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 100);
  const cursor = searchParams.get("cursor");

  let query = supabase
    .from("games")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (teamId) {
    query = query.eq("team_id", teamId);
  }
  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const hasMore = data && data.length > limit;
  const items = hasMore ? data.slice(0, limit) : (data ?? []);
  const nextCursor = hasMore ? items[items.length - 1]?.created_at : null;

  return NextResponse.json({ data: items, next_cursor: nextCursor });
}
