import { createClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  createGameSchema,
  suggestAfterCreate,
  writeAuditLog,
  zodToValidationError,
} from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** POST /api/games — 試合作成 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  const parsed = createGameSchema.safeParse(body);
  if (!parsed.success) {
    const ve = zodToValidationError(parsed.error);
    return NextResponse.json(
      apiError("VALIDATION_ERROR", ve.issues.map((i) => i.message).join("; "), [
        {
          action: "create_game",
          reason: "入力を修正して再試行してください",
          priority: "high",
        },
      ]),
      { status: 400 },
    );
  }

  const input = parsed.data;
  const { data, error } = await supabase
    .from("games")
    .insert({
      team_id: input.team_id,
      title: input.title,
      game_type: input.game_type,
      game_date: input.game_date,
      start_time: input.start_time,
      end_time: input.end_time,
      ground_name: input.ground_name,
      min_players: input.min_players,
      rsvp_deadline: input.rsvp_deadline,
      note: input.note,
      status: "DRAFT",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(apiError("DATABASE_ERROR", error.message), {
      status: 400,
    });
  }

  await writeAuditLog(supabase, {
    actor_type: "USER",
    actor_id: input.team_id,
    action: "CREATE_GAME",
    target_type: "game",
    target_id: data.id,
    after_json: data,
  });

  return NextResponse.json(apiSuccess(data, suggestAfterCreate(data)), {
    status: 201,
  });
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
    return NextResponse.json(apiError("DATABASE_ERROR", error.message), {
      status: 400,
    });
  }

  const hasMore = data && data.length > limit;
  const items = hasMore ? data.slice(0, limit) : (data ?? []);
  const nextCursor = hasMore ? items[items.length - 1]?.created_at : null;

  return NextResponse.json(apiSuccess(items, [], { next_cursor: nextCursor }));
}
