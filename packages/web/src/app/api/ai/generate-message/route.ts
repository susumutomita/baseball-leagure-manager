import { requireAuth, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  generateNegotiationMessage,
} from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** POST /api/ai/generate-message — 交渉メッセージ生成 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const roleCheck = requireRole(authResult, "ADMIN");
  if (roleCheck) return roleCheck;

  const body = await request.json();
  const { game_id, opponent_team_id } = body;

  if (!game_id || typeof game_id !== "string") {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "game_id は必須です"),
      { status: 400 },
    );
  }

  if (!opponent_team_id || typeof opponent_team_id !== "string") {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "opponent_team_id は必須です"),
      { status: 400 },
    );
  }

  const supabase = await createClient();

  // 試合情報を取得
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, team_id, ground_name")
    .eq("id", game_id)
    .single();

  if (gameError || !game) {
    return NextResponse.json(apiError("NOT_FOUND", "試合が見つかりません"), {
      status: 404,
    });
  }

  // チーム情報を取得
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id, name")
    .eq("id", game.team_id)
    .single();

  if (teamError || !team) {
    return NextResponse.json(apiError("NOT_FOUND", "チームが見つかりません"), {
      status: 404,
    });
  }

  // 対戦相手情報を取得
  const { data: opponent, error: opponentError } = await supabase
    .from("opponent_teams")
    .select("id, name")
    .eq("id", opponent_team_id)
    .single();

  if (opponentError || !opponent) {
    return NextResponse.json(
      apiError("NOT_FOUND", "対戦相手が見つかりません"),
      { status: 404 },
    );
  }

  // 交渉の候補日程を取得
  const { data: negotiations } = await supabase
    .from("negotiations")
    .select("proposed_dates_json")
    .eq("game_id", game_id)
    .eq("opponent_team_id", opponent_team_id)
    .order("created_at", { ascending: false })
    .limit(1);

  const proposedDates = negotiations?.[0]?.proposed_dates_json ?? [];

  const message = await generateNegotiationMessage({
    team_name: team.name,
    opponent_name: opponent.name,
    proposed_dates: proposedDates,
    ground_name: game.ground_name ?? undefined,
  });

  return NextResponse.json(
    apiSuccess({ message }, [
      {
        action: "send_negotiation",
        reason: "生成されたメッセージを確認して送信できます",
        priority: "medium",
      },
    ]),
  );
}
