import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  getNotificationHistory,
} from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** GET /api/notifications/history — 通知履歴取得 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const gameId = searchParams.get("game_id") ?? undefined;
  const limit = Math.min(Number(searchParams.get("limit") ?? "50"), 100);
  const offset = Math.max(Number(searchParams.get("offset") ?? "0"), 0);

  if (Number.isNaN(limit) || Number.isNaN(offset)) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "limit / offset は数値で指定してください"),
      { status: 400 },
    );
  }

  const { data, count } = await getNotificationHistory(supabase, {
    teamId: authResult.team_id,
    gameId,
    limit,
    offset,
  });

  return NextResponse.json(
    apiSuccess(data, [], { total: count, limit, offset }),
  );
}
