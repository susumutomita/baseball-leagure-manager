import { createClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  suggestNextActions,
  writeAuditLog,
} from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** GET /api/games/:id */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const [gameRes, rsvpsRes, helpersRes, negotiationsRes] = await Promise.all([
    supabase.from("games").select("*").eq("id", id).single(),
    supabase.from("rsvps").select("*").eq("game_id", id),
    supabase.from("helper_requests").select("*").eq("game_id", id),
    supabase.from("negotiations").select("*").eq("game_id", id),
  ]);

  if (gameRes.error) {
    return NextResponse.json(
      apiError("NOT_FOUND", "試合が見つかりません", [
        {
          action: "list_games",
          reason: "試合一覧を確認してください",
          priority: "high",
        },
      ]),
      { status: 404 },
    );
  }

  const game = gameRes.data;
  const rsvps = rsvpsRes.data ?? [];
  const helperRequests = helpersRes.data ?? [];
  const negotiations = negotiationsRes.data ?? [];

  const nextActions = suggestNextActions({
    game,
    rsvps,
    helperRequests,
    negotiations,
  });

  return NextResponse.json(
    apiSuccess(game, nextActions, {
      available_count: game.available_count,
      unavailable_count: game.unavailable_count,
      maybe_count: game.maybe_count,
      no_response_count: game.no_response_count,
    }),
  );
}

/** PATCH /api/games/:id */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();

  const { data: before, error: fetchError } = await supabase
    .from("games")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError) {
    return NextResponse.json(apiError("NOT_FOUND", "試合が見つかりません"), {
      status: 404,
    });
  }

  // status, version は直接変更不可
  const {
    status: _s,
    version: _v,
    id: _i,
    created_at: _c,
    ...updateFields
  } = body;

  const { data, error } = await supabase
    .from("games")
    .update(updateFields)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(apiError("DATABASE_ERROR", error.message), {
      status: 400,
    });
  }

  await writeAuditLog(supabase, {
    actor_type: "USER",
    actor_id: before.team_id,
    action: "UPDATE_GAME",
    target_type: "game",
    target_id: id,
    before_json: before,
    after_json: data,
  });

  const nextActions = suggestNextActions({ game: data });

  return NextResponse.json(apiSuccess(data, nextActions));
}
