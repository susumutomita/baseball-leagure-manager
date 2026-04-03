import { createClient } from "@/lib/supabase/server";
import {
  apiSuccess,
  calculateBattingStats,
  calculatePitchingStats,
  calculateTeamStats,
} from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** GET /api/teams/:id/stats — チーム・個人統計 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const memberId = searchParams.get("member_id");

  // チーム戦績
  const { data: gameResults } = await supabase
    .from("game_results")
    .select("result, our_score, opponent_score, games!inner(team_id)")
    .eq("games.team_id", id);

  const teamStats = calculateTeamStats(gameResults ?? []);

  // メンバー個別指定の場合
  if (memberId) {
    const [atBatsRes, pitchingRes, gamesRes] = await Promise.all([
      supabase.from("at_bats").select("*").eq("member_id", memberId),
      supabase.from("pitching_stats").select("*").eq("member_id", memberId),
      supabase
        .from("attendances")
        .select("id")
        .eq("person_id", memberId)
        .eq("status", "ATTENDED"),
    ]);

    const gamesPlayed = gamesRes.data?.length ?? 0;
    const batting = calculateBattingStats(atBatsRes.data ?? [], gamesPlayed);
    const pitching = calculatePitchingStats(pitchingRes.data ?? []);

    return NextResponse.json(
      apiSuccess({ teamStats, batting, pitching, gamesPlayed }, []),
    );
  }

  // チーム全体のメンバー別打撃サマリー
  const { data: members } = await supabase
    .from("members")
    .select("id, name")
    .eq("team_id", id)
    .eq("status", "ACTIVE");

  const memberStats = [];
  for (const member of members ?? []) {
    const { data: atBats } = await supabase
      .from("at_bats")
      .select("result, rbi, runs_scored, stolen_base")
      .eq("member_id", member.id);

    const { data: attended } = await supabase
      .from("attendances")
      .select("id")
      .eq("person_id", member.id)
      .eq("status", "ATTENDED");

    if (atBats && atBats.length > 0) {
      const stats = calculateBattingStats(atBats, attended?.length ?? 0);
      memberStats.push({ member_id: member.id, name: member.name, ...stats });
    }
  }

  // 打率順ソート
  memberStats.sort((a, b) => b.avg - a.avg);

  return NextResponse.json(apiSuccess({ teamStats, memberStats }, []));
}
