import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess, writeAuditLog } from "@match-engine/core";
import { NextResponse } from "next/server";

/** POST /api/cron/check-fulfillment — 人数充足チェック・助っ人リクエスト自動キャンセル */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json(apiError("UNAUTHORIZED", "Invalid CRON_SECRET"), {
      status: 401,
    });
  }

  const supabase = await createClient();

  const body = await request.json();
  const gameId = body.game_id;

  if (!gameId) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "game_id is required"),
      { status: 400 },
    );
  }

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, min_players, version")
    .eq("id", gameId)
    .single();

  if (gameError || !game) {
    return NextResponse.json(apiError("NOT_FOUND", "Game not found"), {
      status: 404,
    });
  }

  const { count: availableCount } = await supabase
    .from("rsvps")
    .select("id", { count: "exact", head: true })
    .eq("game_id", gameId)
    .eq("response", "AVAILABLE");

  const { count: acceptedHelperCount } = await supabase
    .from("helper_requests")
    .select("id", { count: "exact", head: true })
    .eq("game_id", gameId)
    .eq("status", "ACCEPTED");

  const totalAvailable = (availableCount ?? 0) + (acceptedHelperCount ?? 0);
  const fulfilled = totalAvailable >= game.min_players;
  let cancelledCount = 0;

  if (fulfilled) {
    const { data: pendingRequests } = await supabase
      .from("helper_requests")
      .select("id")
      .eq("game_id", gameId)
      .eq("status", "PENDING");

    if (pendingRequests && pendingRequests.length > 0) {
      const ids = pendingRequests.map((r) => r.id);

      const { error: cancelError } = await supabase
        .from("helper_requests")
        .update({ status: "CANCELLED", cancel_reason: "FULFILLED" })
        .in("id", ids);

      if (!cancelError) {
        cancelledCount = ids.length;
      }
    }

    await writeAuditLog(supabase, {
      actor_type: "SYSTEM",
      actor_id: "SYSTEM",
      action: "CRON:FULFILLMENT_CHECK",
      target_type: "game",
      target_id: gameId,
      after_json: { totalAvailable, cancelledCount, fulfilled },
    });
  }

  return NextResponse.json(
    apiSuccess({
      fulfilled,
      totalAvailable,
      needed: game.min_players,
      cancelledCount,
    }),
  );
}
