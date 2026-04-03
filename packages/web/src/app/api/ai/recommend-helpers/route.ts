import { requireAuth, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess, recommendHelpers } from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** POST /api/ai/recommend-helpers — 助っ人推薦 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const roleCheck = requireRole(authResult, "ADMIN");
  if (roleCheck) return roleCheck;

  const body = await request.json();
  const gameId = body.game_id;

  if (!gameId || typeof gameId !== "string") {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "game_id は必須です"),
      { status: 400 },
    );
  }

  const supabase = await createClient();

  // 試合情報を取得
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, team_id, min_players, available_count")
    .eq("id", gameId)
    .single();

  if (gameError || !game) {
    return NextResponse.json(apiError("NOT_FOUND", "試合が見つかりません"), {
      status: 404,
    });
  }

  // 不足人数を計算
  const shortage = game.min_players - game.available_count;
  if (shortage <= 0) {
    return NextResponse.json(
      apiSuccess(
        [],
        [
          {
            action: "confirm_game",
            reason: "人数は充足しています。試合を確定できます",
            priority: "medium",
          },
        ],
      ),
    );
  }

  // 助っ人一覧を取得
  const { data: helpers, error: helperError } = await supabase
    .from("helpers")
    .select("id, name, reliability_score, times_helped")
    .eq("team_id", game.team_id);

  if (helperError) {
    return NextResponse.json(apiError("DATABASE_ERROR", helperError.message), {
      status: 400,
    });
  }

  if (!helpers || helpers.length === 0) {
    return NextResponse.json(
      apiSuccess(
        [],
        [
          {
            action: "register_helpers",
            reason: "助っ人が登録されていません。先に助っ人を登録してください",
            priority: "high",
          },
        ],
      ),
    );
  }

  // すでに打診済みの助っ人を除外
  const { data: existingRequests } = await supabase
    .from("helper_requests")
    .select("helper_id")
    .eq("game_id", gameId)
    .in("status", ["PENDING", "ACCEPTED"]);

  const excludeIds = new Set((existingRequests ?? []).map((r) => r.helper_id));
  const availableHelpers = helpers.filter((h) => !excludeIds.has(h.id));

  if (availableHelpers.length === 0) {
    return NextResponse.json(
      apiSuccess(
        [],
        [
          {
            action: "wait_for_responses",
            reason: "すべての助っ人に打診済みです。回答をお待ちください",
            priority: "medium",
          },
        ],
      ),
    );
  }

  const recommendations = await recommendHelpers(availableHelpers, shortage);

  return NextResponse.json(
    apiSuccess({ shortage, recommendations }, [
      {
        action: "create_helper_requests",
        reason: `${shortage}人の不足を補うため、推薦された助っ人に打診できます`,
        priority: "high",
      },
    ]),
  );
}
