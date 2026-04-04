import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess, checkGrounds } from "@match-engine/core";
import { NextResponse } from "next/server";

/**
 * GET /api/cron/grounds — グラウンド空き状況チェック (Vercel Cron 等から呼び出し)
 *
 * watch_active なグラウンドを持つ全チームをチェックし、
 * 新しい空きが見つかった場合に通知を発行する。
 */
export async function GET(request: Request) {
  // Cron シークレットの検証
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(apiError("UNAUTHORIZED", "Invalid CRON_SECRET"), {
      status: 401,
    });
  }

  const supabase = await createClient();

  // watch_active なグラウンドを持つチームIDを取得
  const { data: activeGrounds, error: queryError } = await supabase
    .from("grounds")
    .select("team_id")
    .eq("watch_active", true);

  if (queryError) {
    return NextResponse.json(apiError("DATABASE_ERROR", queryError.message), {
      status: 500,
    });
  }

  // ユニークなチームIDを抽出
  const teamIds = [...new Set((activeGrounds ?? []).map((g) => g.team_id))];

  const results = [];
  let totalNewAvailabilities = 0;

  for (const teamId of teamIds) {
    try {
      const result = await checkGrounds(supabase, teamId);
      results.push(result);
      totalNewAvailabilities += result.totalNewAvailabilities;
    } catch (e) {
      console.error(`チーム ${teamId} のグラウンドチェック失敗:`, e);
      results.push({
        teamId,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return NextResponse.json(
    apiSuccess({
      teamsChecked: teamIds.length,
      totalNewAvailabilities,
      results,
    }),
  );
}
