import { createClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  calculateStandings,
  rankStandings,
} from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** GET /api/leagues/:id/standings — 順位表取得 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: leagueId } = await params;
  const supabase = await createClient();

  // 参加チーム
  const { data: teams } = await supabase
    .from("league_teams")
    .select("team_id")
    .eq("league_id", leagueId)
    .eq("status", "ACCEPTED");

  const teamIds = (teams ?? []).map((t) => t.team_id);

  // 全試合
  const { data: matches, error } = await supabase
    .from("league_matches")
    .select("*")
    .eq("league_id", leagueId);

  if (error) {
    return NextResponse.json(apiError("DATABASE_ERROR", error.message), {
      status: 400,
    });
  }

  const standings = calculateStandings(matches ?? [], teamIds, leagueId);
  const ranked = rankStandings(standings);

  return NextResponse.json(apiSuccess(ranked));
}
