import { createClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  calculateBattingStats,
  calculatePitchingStats,
  calculateTeamStats,
} from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** GET /api/stats?team_id=xxx&member_id=xxx */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get("team_id");
  const memberId = searchParams.get("member_id");

  if (!teamId) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "team_id は必須です"),
      { status: 400 },
    );
  }

  // チーム戦績
  const { data: gameResults } = await supabase
    .from("game_results")
    .select("result, our_score, opponent_score, games!inner(team_id)")
    .eq("games.team_id", teamId);

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
    .eq("team_id", teamId)
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
