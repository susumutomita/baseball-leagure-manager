// ============================================================
// 出席可能日ヒートマップ — メンバーの傾向分析
// ============================================================
import type { Game, Rsvp } from "../types/domain";

/** 曜日別の出席傾向 */
export interface DayOfWeekTrend {
  dayOfWeek: number; // 0=日, 1=月, ..., 6=土
  dayName: string;
  totalGames: number;
  availableCount: number;
  availableRate: number;
}

/** メンバーの出席パターン */
export interface MemberAvailabilityPattern {
  memberId: string;
  dayOfWeekTrends: DayOfWeekTrend[];
  bestDay: string | null;
  worstDay: string | null;
}

const DAY_NAMES = ["日曜", "月曜", "火曜", "水曜", "木曜", "金曜", "土曜"];

/**
 * メンバーの曜日別出席パターンを分析する
 */
export function analyzeMemberAvailability(
  memberId: string,
  rsvps: Rsvp[],
  games: Game[],
): MemberAvailabilityPattern {
  const gameMap = new Map(games.map((g) => [g.id, g]));
  const memberRsvps = rsvps.filter((r) => r.member_id === memberId);

  const dayStats = Array.from({ length: 7 }, (_, i) => ({
    dayOfWeek: i,
    totalGames: 0,
    availableCount: 0,
  }));

  for (const rsvp of memberRsvps) {
    const game = gameMap.get(rsvp.game_id);
    if (!game?.game_date) continue;

    const dayOfWeek = new Date(game.game_date).getDay();
    dayStats[dayOfWeek]!.totalGames++;
    if (rsvp.response === "AVAILABLE") {
      dayStats[dayOfWeek]!.availableCount++;
    }
  }

  const dayOfWeekTrends: DayOfWeekTrend[] = dayStats.map((stat) => ({
    dayOfWeek: stat.dayOfWeek,
    dayName: DAY_NAMES[stat.dayOfWeek]!,
    totalGames: stat.totalGames,
    availableCount: stat.availableCount,
    availableRate:
      stat.totalGames > 0
        ? Math.round((stat.availableCount / stat.totalGames) * 1000) / 1000
        : 0,
  }));

  // 3試合以上のデータがある曜日で最高/最低を判定
  const significantDays = dayOfWeekTrends.filter((d) => d.totalGames >= 3);
  const bestDay =
    significantDays.length > 0
      ? significantDays.reduce((a, b) =>
          a.availableRate > b.availableRate ? a : b,
        ).dayName
      : null;
  const worstDay =
    significantDays.length > 0
      ? significantDays.reduce((a, b) =>
          a.availableRate < b.availableRate ? a : b,
        ).dayName
      : null;

  return { memberId, dayOfWeekTrends, bestDay, worstDay };
}

/**
 * チーム全体の曜日別出席率を計算する
 */
export function analyzeTeamAvailability(
  rsvps: Rsvp[],
  games: Game[],
): DayOfWeekTrend[] {
  const gameMap = new Map(games.map((g) => [g.id, g]));

  const dayStats = Array.from({ length: 7 }, (_, i) => ({
    dayOfWeek: i,
    totalRsvps: 0,
    availableCount: 0,
  }));

  for (const rsvp of rsvps) {
    const game = gameMap.get(rsvp.game_id);
    if (!game?.game_date) continue;
    if (rsvp.response === "NO_RESPONSE") continue;

    const dayOfWeek = new Date(game.game_date).getDay();
    dayStats[dayOfWeek]!.totalRsvps++;
    if (rsvp.response === "AVAILABLE") {
      dayStats[dayOfWeek]!.availableCount++;
    }
  }

  return dayStats.map((stat) => ({
    dayOfWeek: stat.dayOfWeek,
    dayName: DAY_NAMES[stat.dayOfWeek]!,
    totalGames: stat.totalRsvps,
    availableCount: stat.availableCount,
    availableRate:
      stat.totalRsvps > 0
        ? Math.round((stat.availableCount / stat.totalRsvps) * 1000) / 1000
        : 0,
  }));
}
