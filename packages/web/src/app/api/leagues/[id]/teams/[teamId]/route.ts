import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** PATCH /api/leagues/:id/teams/:teamId — 招待承認/辞退 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; teamId: string }> },
) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  const { id: leagueId, teamId } = await params;
  const supabase = await createClient();
  const body = await request.json();
  const status = body.status as string;

  if (!["ACCEPTED", "DECLINED", "WITHDRAWN"].includes(status)) {
    return NextResponse.json(
      apiError(
        "VALIDATION_ERROR",
        "statusはACCEPTED/DECLINED/WITHDRAWNのいずれかです",
      ),
      { status: 400 },
    );
  }

  const updates: Record<string, unknown> = { status };
  if (status === "ACCEPTED") {
    updates.joined_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from("league_teams")
    .update(updates)
    .eq("league_id", leagueId)
    .eq("team_id", teamId)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json(
      apiError("NOT_FOUND", "リーグチームが見つかりません"),
      { status: 404 },
    );
  }

  return NextResponse.json(apiSuccess(data));
}
