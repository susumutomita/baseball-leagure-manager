// ============================================================
// リーグ順位表計算 — Issue #111
// 勝ち=3点, 引き分け=1点, 負け=0点
// ============================================================
import type { LeagueMatch, LeagueStanding } from "../types/domain";

export type RankedStanding = LeagueStanding & { rank: number };

/**
 * 完了した試合から順位表を算出
 */
export function calculateStandings(
  matches: LeagueMatch[],
  teamIds: string[],
  leagueId = "",
): Omit<LeagueStanding, "id" | "created_at" | "updated_at">[] {
  const map = new Map<
    string,
    Omit<LeagueStanding, "id" | "created_at" | "updated_at">
  >();

  for (const teamId of teamIds) {
    map.set(teamId, {
      league_id: leagueId,
      team_id: teamId,
      wins: 0,
      losses: 0,
      draws: 0,
      points: 0,
      runs_for: 0,
      runs_against: 0,
      games_played: 0,
    });
  }

  for (const match of matches) {
    if (match.status !== "COMPLETED") continue;
    if (match.home_score === null || match.away_score === null) continue;

    const home = map.get(match.home_team_id);
    const away = map.get(match.away_team_id);
    if (!home || !away) continue;

    home.games_played++;
    away.games_played++;
    home.runs_for += match.home_score;
    home.runs_against += match.away_score;
    away.runs_for += match.away_score;
    away.runs_against += match.home_score;

    if (match.home_score > match.away_score) {
      home.wins++;
      home.points += 3;
      away.losses++;
    } else if (match.home_score < match.away_score) {
      away.wins++;
      away.points += 3;
      home.losses++;
    } else {
      home.draws++;
      away.draws++;
      home.points += 1;
      away.points += 1;
    }
  }

  return Array.from(map.values());
}

/**
 * 順位表にランクを付与
 * ソート: 勝ち点 DESC → 得失点差 DESC → 得点 DESC
 */
export function rankStandings(
  standings: Omit<LeagueStanding, "id" | "created_at" | "updated_at">[],
): (Omit<LeagueStanding, "id" | "created_at" | "updated_at"> & {
  rank: number;
})[] {
  const sorted = [...standings].sort((a, b) => {
    // 勝ち点
    if (b.points !== a.points) return b.points - a.points;
    // 得失点差
    const diffA = a.runs_for - a.runs_against;
    const diffB = b.runs_for - b.runs_against;
    if (diffB !== diffA) return diffB - diffA;
    // 得点
    return b.runs_for - a.runs_for;
  });

  return sorted.map((s, i) => ({ ...s, rank: i + 1 }));
}
