import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@match-engine/core";
import { NextResponse } from "next/server";

const REMINDER_HOURS = [24, 48, 72] as const;

/** POST /api/cron/send-reminders — 締切前リマインダーを通知ログに挿入 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(apiError("UNAUTHORIZED", "Invalid CRON_SECRET"), {
      status: 401,
    });
  }

  const supabase = await createClient();

  const { data: games, error } = await supabase
    .from("games")
    .select("id, team_id, rsvp_deadline")
    .eq("status", "COLLECTING")
    .not("rsvp_deadline", "is", null);

  if (error) {
    return NextResponse.json(apiError("DATABASE_ERROR", error.message), {
      status: 500,
    });
  }

  const now = new Date();
  let remindersQueued = 0;

  for (const game of games ?? []) {
    const deadline = new Date(game.rsvp_deadline);

    for (const hours of REMINDER_HOURS) {
      const reminderTime = new Date(
        deadline.getTime() - hours * 60 * 60 * 1000,
      );

      if (now < reminderTime) continue;

      const marker = `${hours}h`;

      const { data: existing } = await supabase
        .from("notification_logs")
        .select("id")
        .eq("game_id", game.id)
        .eq("notification_type", "REMINDER")
        .like("content", `%${marker}%`)
        .limit(1);

      if (existing && existing.length > 0) continue;

      const { error: insertError } = await supabase
        .from("notification_logs")
        .insert({
          team_id: game.team_id,
          game_id: game.id,
          recipient_type: "MEMBER",
          notification_type: "REMINDER",
          content: `締切${marker}前リマインダー`,
        });

      if (insertError) {
        console.error(
          `リマインダー挿入失敗 (game=${game.id}, ${marker}):`,
          insertError,
        );
        continue;
      }

      remindersQueued++;
    }
  }

  return NextResponse.json(apiSuccess({ remindersQueued }));
}
