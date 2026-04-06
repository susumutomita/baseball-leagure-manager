import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess, validateRsvpToken } from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/**
 * GET /api/rsvps/:id/game?token=xxx — トークン認証でゲーム情報+RSVP取得
 * Web RSVPページ用。requireAuth 不要（トークンで認証）。
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: rsvpId } = await params;
  const { searchParams } = new URL(request.url);
  const token = searchParams.get("token");

  if (!token) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "トークンが必要です"),
      { status: 400 },
    );
  }

  const validation = validateRsvpToken(token);
  if (!validation.valid || !validation.payload) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", validation.reason ?? "トークンが無効です"),
      { status: 400 },
    );
  }

  if (validation.payload.rsvpId !== rsvpId) {
    return NextResponse.json(apiError("VALIDATION_ERROR", "トークン不一致"), {
      status: 400,
    });
  }

  const supabase = await createClient();
  const { gameId, memberId } = validation.payload;

  // ゲーム情報
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select(
      "id, title, game_date, start_time, ground_name, available_count, min_players",
    )
    .eq("id", gameId)
    .single();

  if (gameError || !game) {
    return NextResponse.json(apiError("NOT_FOUND", "試合が見つかりません"), {
      status: 404,
    });
  }

  // RSVP情報
  const { data: rsvp } = await supabase
    .from("rsvps")
    .select("id, response, member_id")
    .eq("id", rsvpId)
    .single();

  // メンバー名
  const { data: member } = await supabase
    .from("members")
    .select("name")
    .eq("id", memberId)
    .single();

  return NextResponse.json(
    apiSuccess({
      game,
      rsvp: rsvp
        ? {
            id: rsvp.id,
            response: rsvp.response,
            member_name: member?.name ?? memberId,
          }
        : null,
    }),
  );
}
