import { createClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  checkGrounds,
  writeAuditLog,
} from "@match-engine/core";
import { NextResponse } from "next/server";

/**
 * GET /api/cron/daily — 日次 cron ジョブ (reminders + deadlines + grounds を統合)
 *
 * Vercel Hobby プランの cron 上限 (2件) に対応するため、
 * 以下の 3 つのタスクをまとめて実行する:
 * 1. reminders  — 未回答メンバーへのリマインダー通知挿入
 * 2. deadlines  — rsvp_deadline 超過ゲームを ASSESSING に遷移
 * 3. grounds    — watch_active なグラウンドの空き確認
 *
 * 認証: Bearer CRON_SECRET ヘッダー
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(apiError("UNAUTHORIZED", "Invalid CRON_SECRET"), {
      status: 401,
    });
  }

  const supabase = await createClient();
  const now = new Date();

  // ── 1. Reminders ──────────────────────────────────────────────────────────
  const cutoff = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const { data: gamesForReminder } = await supabase
    .from("games")
    .select("id, team_id, rsvp_deadline")
    .eq("status", "COLLECTING")
    .not("rsvp_deadline", "is", null)
    .gt("rsvp_deadline", now.toISOString())
    .lte("rsvp_deadline", cutoff.toISOString());

  let totalReminders = 0;
  const reminderResults: Array<{
    gameId: string;
    reminders: number;
    error?: string;
  }> = [];

  for (const game of gamesForReminder ?? []) {
    try {
      const { data: responded } = await supabase
        .from("rsvps")
        .select("member_id")
        .eq("game_id", game.id);

      const respondedIds = (responded ?? []).map((r) => r.member_id);

      const { data: members } = await supabase
        .from("members")
        .select("id")
        .eq("team_id", game.team_id);

      const unresponsive = (members ?? []).filter(
        (m) => !respondedIds.includes(m.id),
      );

      let gameReminders = 0;
      for (const member of unresponsive) {
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

        if (!insertError) gameReminders++;
      }

      totalReminders += gameReminders;
      reminderResults.push({ gameId: game.id, reminders: gameReminders });
    } catch (e) {
      reminderResults.push({
        gameId: game.id,
        reminders: 0,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  // ── 2. Deadlines ──────────────────────────────────────────────────────────
  const { data: overdueGames, error: deadlineError } = await supabase
    .from("games")
    .select("id, version")
    .eq("status", "COLLECTING")
    .lte("rsvp_deadline", now.toISOString());

  if (deadlineError) {
    return NextResponse.json(
      apiError("DATABASE_ERROR", deadlineError.message),
      {
        status: 500,
      },
    );
  }

  let deadlinesProcessed = 0;
  const deadlineErrors: Array<{ gameId: string; error: string }> = [];

  for (const game of overdueGames ?? []) {
    const { error: updateError } = await supabase
      .from("games")
      .update({ status: "ASSESSING", version: game.version + 1 })
      .eq("id", game.id)
      .eq("version", game.version);

    if (updateError) {
      deadlineErrors.push({ gameId: game.id, error: updateError.message });
      continue;
    }

    await writeAuditLog(supabase, {
      actor_type: "SYSTEM",
      actor_id: "SYSTEM",
      action: "CRON:DEADLINE_PROCESSED",
      target_type: "game",
      target_id: game.id,
      after_json: {
        previous_status: "COLLECTING",
        new_status: "ASSESSING",
        previous_version: game.version,
      },
    });

    deadlinesProcessed++;
  }

  // ── 3. Grounds ────────────────────────────────────────────────────────────
  const { data: activeGrounds, error: groundsError } = await supabase
    .from("grounds")
    .select("team_id")
    .eq("watch_active", true);

  if (groundsError) {
    return NextResponse.json(apiError("DATABASE_ERROR", groundsError.message), {
      status: 500,
    });
  }

  const teamIds = [...new Set((activeGrounds ?? []).map((g) => g.team_id))];
  const groundsResults = [];
  let totalNewAvailabilities = 0;

  for (const teamId of teamIds) {
    try {
      const result = await checkGrounds(supabase, teamId);
      groundsResults.push(result);
      totalNewAvailabilities += result.totalNewAvailabilities;
    } catch (e) {
      groundsResults.push({
        teamId,
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  return NextResponse.json(
    apiSuccess({
      processedAt: now.toISOString(),
      reminders: {
        gamesProcessed: (gamesForReminder ?? []).length,
        totalReminders,
        results: reminderResults,
      },
      deadlines: {
        processedCount: deadlinesProcessed,
        totalFound: (overdueGames ?? []).length,
        errors: deadlineErrors.length > 0 ? deadlineErrors : undefined,
      },
      grounds: {
        teamsChecked: teamIds.length,
        totalNewAvailabilities,
        results: groundsResults,
      },
    }),
  );
}
