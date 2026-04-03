import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess, writeAuditLog } from "@match-engine/core";
import { NextResponse } from "next/server";

/** POST /api/cron/process-deadlines — 締切到達ゲームを CONFIRMED に遷移 */
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
    .select("id, version")
    .eq("status", "COLLECTING")
    .lte("rsvp_deadline", new Date().toISOString());

  if (error) {
    return NextResponse.json(apiError("DATABASE_ERROR", error.message), {
      status: 500,
    });
  }

  let processedCount = 0;

  for (const game of games ?? []) {
    const { error: updateError } = await supabase
      .from("games")
      .update({ status: "CONFIRMED", version: game.version + 1 })
      .eq("id", game.id);

    if (updateError) {
      console.error(`ゲーム ${game.id} の更新失敗:`, updateError);
      continue;
    }

    await writeAuditLog(supabase, {
      actor_type: "SYSTEM",
      actor_id: "SYSTEM",
      action: "CRON:DEADLINE_PROCESSED",
      target_type: "game",
      target_id: game.id,
      after_json: { previous_version: game.version },
    });

    processedCount++;
  }

  return NextResponse.json(apiSuccess({ processedCount }));
}
