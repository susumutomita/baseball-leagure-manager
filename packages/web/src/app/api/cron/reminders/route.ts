import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@match-engine/core";
import { NextResponse } from "next/server";

/**
 * GET /api/cron/reminders — 未回答メンバーへの出欠リマインダーを通知ログに挿入
 *
 * rsvp_deadline が 48 時間以内に迫っている COLLECTING 状態のゲームを検索し、
 * まだ回答していないメンバーに対してリマインダー通知を発行する。
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
  const now = new Date();
  const cutoff = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  // rsvp_deadline が 48 時間以内の COLLECTING ゲームを取得
  const { data: games, error: gamesError } = await supabase
    .from("games")
    .select("id, team_id, rsvp_deadline")
    .eq("status", "COLLECTING")
    .not("rsvp_deadline", "is", null)
    .gt("rsvp_deadline", now.toISOString())
    .lte("rsvp_deadline", cutoff.toISOString());

  if (gamesError) {
    return NextResponse.json(apiError("DATABASE_ERROR", gamesError.message), {
      status: 500,
    });
  }

  let totalReminders = 0;
  const results: Array<{
    gameId: string;
    reminders: number;
    error?: string;
  }> = [];

  for (const game of games ?? []) {
    try {
      // このゲームに既に回答済みのメンバーIDを取得
      const { data: responded } = await supabase
        .from("rsvps")
        .select("member_id")
        .eq("game_id", game.id);

      const respondedIds = (responded ?? []).map((r) => r.member_id);

      // チームの全メンバーを取得
      const { data: members } = await supabase
        .from("members")
        .select("id")
        .eq("team_id", game.team_id);

      // 未回答メンバーを抽出
      const unresponsive = (members ?? []).filter(
        (m) => !respondedIds.includes(m.id),
      );

      let gameReminders = 0;

      for (const member of unresponsive) {
        // 既にこのゲーム・メンバーに対してリマインダーを送信済みかチェック
        const { data: existing } = await supabase
          .from("notification_logs")
          .select("id")
          .eq("game_id", game.id)
          .eq("recipient_id", member.id)
          .eq("notification_type", "REMINDER")
          .limit(1);

        if (existing && existing.length > 0) continue;

        const { error: insertError } = await supabase
          .from("notification_logs")
          .insert({
            team_id: game.team_id,
            game_id: game.id,
            recipient_type: "MEMBER",
            recipient_id: member.id,
            notification_type: "REMINDER",
            content: "出欠回答リマインダー: 締切が近づいています",
          });

        if (insertError) {
          console.error(
            `リマインダー挿入失敗 (game=${game.id}, member=${member.id}):`,
            insertError,
          );
          continue;
        }

        gameReminders++;
      }

      totalReminders += gameReminders;
      results.push({ gameId: game.id, reminders: gameReminders });
    } catch (e) {
      console.error(`ゲーム ${game.id} のリマインダー処理失敗:`, e);
      results.push({
        gameId: game.id,
        reminders: 0,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return NextResponse.json(
    apiSuccess({
      gamesProcessed: (games ?? []).length,
      totalReminders,
      results,
    }),
  );
}
