import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess, writeAuditLog } from "@match-engine/core";
import { NextResponse } from "next/server";

/**
 * GET /api/cron/deadlines — 締切到達ゲームを ASSESSING に遷移
 *
 * rsvp_deadline が過ぎた COLLECTING 状態のゲームを検索し、
 * ASSESSING ステータスに遷移させる。
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

  // 締切が過ぎた COLLECTING ゲームを取得
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
  const errors: Array<{ gameId: string; error: string }> = [];

  for (const game of games ?? []) {
    const { error: updateError } = await supabase
      .from("games")
      .update({ status: "ASSESSING", version: game.version + 1 })
      .eq("id", game.id)
      .eq("version", game.version);

    if (updateError) {
      console.error(`ゲーム ${game.id} の ASSESSING 遷移失敗:`, updateError);
      errors.push({ gameId: game.id, error: updateError.message });
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

    processedCount++;
  }

  return NextResponse.json(
    apiSuccess({
      processedCount,
      totalFound: (games ?? []).length,
      errors: errors.length > 0 ? errors : undefined,
    }),
  );
}
