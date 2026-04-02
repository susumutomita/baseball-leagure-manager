import {
  extractToken,
  isVerifyError,
  verifyLiffToken,
} from "@/lib/liff/verify";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/** GET /api/liff/games/:id/my-rsvp — 自分のRSVPと試合情報を取得 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: gameId } = await params;

  const token = extractToken(request);
  if (!token) {
    return NextResponse.json(
      { error: "Authorization header required" },
      { status: 401 },
    );
  }

  const result = await verifyLiffToken(token);
  if (isVerifyError(result)) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }

  const supabase = await createClient();

  // メンバー検索
  const { data: member } = await supabase
    .from("members")
    .select("id, team_id, name")
    .eq("line_user_id", result.lineUserId)
    .eq("status", "ACTIVE")
    .single();

  if (!member) {
    return NextResponse.json(
      { error: "Member not linked", lineUserId: result.lineUserId },
      { status: 404 },
    );
  }

  // 試合情報
  const { data: game } = await supabase
    .from("games")
    .select(
      "id, title, game_type, status, game_date, start_time, end_time, ground_name, min_players, available_count, unavailable_count, maybe_count, no_response_count",
    )
    .eq("id", gameId)
    .eq("team_id", member.team_id)
    .single();

  if (!game) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  // 自分のRSVP
  const { data: rsvp } = await supabase
    .from("rsvps")
    .select("id, response, responded_at")
    .eq("game_id", gameId)
    .eq("member_id", member.id)
    .single();

  return NextResponse.json({
    member: { id: member.id, name: member.name },
    game,
    rsvp: rsvp ?? null,
  });
}
