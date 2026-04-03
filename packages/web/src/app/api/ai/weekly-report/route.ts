import { requireAuth, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess, generateWeeklyReport } from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** POST /api/ai/weekly-report — 週次レポート生成 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const roleCheck = requireRole(authResult, "ADMIN");
  if (roleCheck) return roleCheck;

  const body = await request.json();
  const teamId = body.team_id;

  if (!teamId || typeof teamId !== "string") {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "team_id は必須です"),
      { status: 400 },
    );
  }

  const supabase = await createClient();

  // チームの存在確認
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .select("id")
    .eq("id", teamId)
    .single();

  if (teamError || !team) {
    return NextResponse.json(apiError("NOT_FOUND", "チームが見つかりません"), {
      status: 404,
    });
  }

  // 今後1週間 + 過去1週間の試合を取得
  const now = new Date();
  const oneWeekAgo = new Date(now);
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
  const oneWeekLater = new Date(now);
  oneWeekLater.setDate(oneWeekLater.getDate() + 7);

  const { data: games, error: gamesError } = await supabase
    .from("games")
    .select("title, status, game_date, available_count, min_players")
    .eq("team_id", teamId)
    .gte("game_date", oneWeekAgo.toISOString().split("T")[0])
    .lte("game_date", oneWeekLater.toISOString().split("T")[0])
    .order("game_date", { ascending: true });

  if (gamesError) {
    return NextResponse.json(apiError("DATABASE_ERROR", gamesError.message), {
      status: 400,
    });
  }

  const report = await generateWeeklyReport(games ?? []);

  return NextResponse.json(
    apiSuccess({ report }, [
      {
        action: "share_report",
        reason: "レポートをチームメンバーに共有できます",
        priority: "low",
      },
    ]),
  );
}
