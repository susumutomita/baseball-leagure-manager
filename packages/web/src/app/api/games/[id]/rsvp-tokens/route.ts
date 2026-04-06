import { requireAuth, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  buildRsvpUrl,
  generateRsvpToken,
} from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** POST /api/games/:id/rsvp-tokens — 全メンバー分のRSVPトークン生成 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const roleCheck = requireRole(authResult, "ADMIN");
  if (roleCheck) return roleCheck;

  const { id: gameId } = await params;
  const supabase = await createClient();

  // ゲーム情報
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, game_date, team_id")
    .eq("id", gameId)
    .single();

  if (gameError || !game) {
    return NextResponse.json(apiError("NOT_FOUND", "試合が見つかりません"), {
      status: 404,
    });
  }

  // RSVP一覧
  const { data: rsvps, error: rsvpError } = await supabase
    .from("rsvps")
    .select("id, member_id")
    .eq("game_id", gameId);

  if (rsvpError || !rsvps) {
    return NextResponse.json(apiError("DATABASE_ERROR", "RSVPの取得に失敗"), {
      status: 400,
    });
  }

  // メンバー名を取得
  const memberIds = rsvps.map((r) => r.member_id);
  const { data: members } = await supabase
    .from("members")
    .select("id, name")
    .in("id", memberIds);

  const memberMap = new Map(
    (members ?? []).map((m) => [m.id, m.name as string]),
  );

  // トークンの有効期限 = 試合日 or 7日後
  const expiresAt = game.game_date
    ? new Date(`${game.game_date}T23:59:59Z`).toISOString()
    : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://mound.app";

  const tokens = rsvps.map((rsvp) => {
    const token = generateRsvpToken({
      gameId,
      memberId: rsvp.member_id,
      rsvpId: rsvp.id,
      expiresAt,
    });
    return {
      memberId: rsvp.member_id,
      memberName: memberMap.get(rsvp.member_id) ?? "不明",
      rsvpId: rsvp.id,
      token,
      url: buildRsvpUrl(baseUrl, token),
    };
  });

  return NextResponse.json(apiSuccess(tokens));
}
