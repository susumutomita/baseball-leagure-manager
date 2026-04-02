import { createClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  canConfirm,
  checkStopConditions,
  suggestNextActions,
} from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** POST /api/games/:id/validate — 成立可能性チェック */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("*")
    .eq("id", id)
    .single();

  if (gameError) {
    return NextResponse.json(apiError("NOT_FOUND", "試合が見つかりません"), {
      status: 404,
    });
  }

  const [rsvpsRes, helpersRes, negotiationsRes] = await Promise.all([
    supabase.from("rsvps").select("*").eq("game_id", id),
    supabase.from("helper_requests").select("*").eq("game_id", id),
    supabase.from("negotiations").select("*").eq("game_id", id),
  ]);

  const rsvps = rsvpsRes.data ?? [];
  const helperRequests = helpersRes.data ?? [];
  const negotiations = negotiationsRes.data ?? [];

  const confirmCheck = canConfirm({
    game,
    rsvps,
    helperRequests,
    negotiations,
    hasGround: body.has_ground ?? false,
  });
  const stopConditions = checkStopConditions({ game, negotiations });

  const nextActions = suggestNextActions({
    game,
    rsvps,
    helperRequests,
    negotiations,
  });

  return NextResponse.json(
    apiSuccess(
      {
        canConfirm: confirmCheck,
        stopConditions,
      },
      nextActions,
    ),
  );
}
