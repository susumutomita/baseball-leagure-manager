import { createClient } from "@/lib/supabase/server";
import {
  type GameOrchestrationContext,
  apiError,
  apiSuccess,
  formatActionsAsSummary,
  orchestrateTeam,
  writeAuditLog,
} from "@match-engine/core";
import { NextResponse } from "next/server";

/**
 * POST /api/cron/orchestrate
 *
 * ゲームオーケストレーション cron ジョブ。
 * 全チームの DRAFT/COLLECTING/CONFIRMED ゲームを取得し、
 * 次に必要なアクションを判定して通知を生成する。
 *
 * 認証: Bearer CRON_SECRET ヘッダー
 *
 * オプション body:
 *   { team_id?: string } — 特定チームのみ処理
 */
export async function POST(request: Request) {
  // --- 認証 ---
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(apiError("UNAUTHORIZED", "Invalid CRON_SECRET"), {
      status: 401,
    });
  }

  // --- パラメータ ---
  let teamIdFilter: string | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    teamIdFilter = body.team_id;
  } catch {
    // body なしでも OK
  }

  const supabase = await createClient();

  // --- チーム取得 ---
  let teamsQuery = supabase.from("teams").select("id, name");
  if (teamIdFilter) {
    teamsQuery = teamsQuery.eq("id", teamIdFilter);
  }
  const { data: teams, error: teamsError } = await teamsQuery;

  if (teamsError) {
    return NextResponse.json(apiError("DATABASE_ERROR", teamsError.message), {
      status: 500,
    });
  }

  if (!teams || teams.length === 0) {
    return NextResponse.json(
      apiSuccess({ message: "No teams found", results: [] }),
    );
  }

  const allResults = [];

  for (const team of teams) {
    // --- アクティブなゲーム取得 ---
    const { data: games, error: gamesError } = await supabase
      .from("games")
      .select("*")
      .eq("team_id", team.id)
      .in("status", ["DRAFT", "COLLECTING", "CONFIRMED"]);

    if (gamesError) {
      console.error(`チーム ${team.id} のゲーム取得失敗:`, gamesError);
      continue;
    }

    if (!games || games.length === 0) continue;

    // --- 各ゲームのコンテキストを構築 ---
    const contexts: GameOrchestrationContext[] = [];

    for (const game of games) {
      const [
        { data: rsvps },
        { data: members },
        { data: helperRequests },
        { data: negotiations },
        { data: notificationLogs },
      ] = await Promise.all([
        supabase.from("rsvps").select("*").eq("game_id", game.id),
        supabase
          .from("members")
          .select("*")
          .eq("team_id", team.id)
          .eq("status", "ACTIVE"),
        supabase.from("helper_requests").select("*").eq("game_id", game.id),
        supabase.from("negotiations").select("*").eq("game_id", game.id),
        supabase
          .from("notification_logs")
          .select("notification_type")
          .eq("game_id", game.id),
      ]);

      // 送信済み通知タイプを抽出
      const sentNotificationTypes = [
        ...new Set((notificationLogs ?? []).map((n) => n.notification_type)),
      ];

      contexts.push({
        game,
        team: {
          ...team,
          home_area: "",
          activity_day: null,
          owner_user_id: null,
          settings_json: {},
          created_at: "",
          updated_at: "",
        },
        rsvps: rsvps ?? [],
        members: members ?? [],
        helperRequests: helperRequests ?? [],
        negotiations: negotiations ?? [],
        sentNotificationTypes,
      });
    }

    // --- オーケストレーション実行 ---
    const result = orchestrateTeam(team.id, team.name, contexts);

    // --- 監査ログ ---
    if (result.totalActions > 0) {
      await writeAuditLog(supabase, {
        actor_type: "SYSTEM",
        actor_id: "ORCHESTRATOR",
        action: "CRON:ORCHESTRATE",
        target_type: "team",
        target_id: team.id,
        after_json: {
          gamesProcessed: result.games.length,
          totalActions: result.totalActions,
          summary: formatActionsAsSummary(result.games),
        },
      });
    }

    allResults.push({
      teamId: team.id,
      teamName: team.name,
      gamesProcessed: result.games.length,
      totalActions: result.totalActions,
      games: result.games.map((g) => ({
        gameId: g.gameId,
        gameTitle: g.gameTitle,
        status: g.status,
        actionCount: g.actions.length,
        actions: g.actions.map((a) => ({
          type: a.type,
          priority: a.priority,
          description: a.description,
        })),
      })),
    });
  }

  return NextResponse.json(
    apiSuccess({
      processedAt: new Date().toISOString(),
      teamsProcessed: allResults.length,
      totalActions: allResults.reduce((sum, r) => sum + r.totalActions, 0),
      results: allResults,
    }),
  );
}
