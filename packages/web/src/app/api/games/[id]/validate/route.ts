import { createClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  canArrange,
  canAssess,
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

  const [rsvpsRes, helpersRes, negotiationsRes, membersRes] = await Promise.all(
    [
      supabase.from("rsvps").select("*").eq("game_id", id),
      supabase.from("helper_requests").select("*").eq("game_id", id),
      supabase.from("negotiations").select("*").eq("game_id", id),
      supabase
        .from("members")
        .select("id")
        .eq("team_id", game.team_id)
        .eq("status", "ACTIVE"),
    ],
  );

  const rsvps = rsvpsRes.data ?? [];
  const helperRequests = helpersRes.data ?? [];
  const negotiations = negotiationsRes.data ?? [];
  const totalMembers = membersRes.data?.length ?? 0;

  const assessCheck = canAssess({ game, rsvps, totalMembers });
  const arrangeCheck = canArrange({ game, rsvps, helperRequests });
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
    totalMembers,
  });

  return NextResponse.json(
    apiSuccess(
      {
        canAssess: assessCheck,
        canArrange: arrangeCheck,
        canConfirm: confirmCheck,
        stopConditions,
      },
      nextActions,
    ),
  );
}
