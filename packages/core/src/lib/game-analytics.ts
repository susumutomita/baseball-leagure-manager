// ============================================================
// ゲーム分析ユーティリティ — 試合結果の統計・トレンド分析
// ============================================================
import type { Game, GameResult } from "../types/domain";

/** 勝敗統計 */
export interface WinLossRecord {
  wins: number;
  losses: number;
  draws: number;
  total: number;
  winRate: number;
}

/** シーズンサマリー */
export interface SeasonSummary {
  totalGames: number;
  completedGames: number;
  cancelledGames: number;
  cancelRate: number;
  record: WinLossRecord;
  averageScore: number;
  averageOpponentScore: number;
}

/** 月別の試合統計 */
export interface MonthlyStats {
  month: string;
  gamesPlayed: number;
  record: WinLossRecord;
}

/**
 * 試合結果から勝敗レコードを集計する
 */
export function calculateWinLossRecord(results: GameResult[]): WinLossRecord {
  const wins = results.filter((r) => r.result === "WIN").length;
  const losses = results.filter((r) => r.result === "LOSE").length;
  const draws = results.filter((r) => r.result === "DRAW").length;
  const total = wins + losses + draws;
  const winRate = total > 0 ? Math.round((wins / total) * 1000) / 1000 : 0;

  return { wins, losses, draws, total, winRate };
}

/**
 * シーズンサマリーを生成する
 */
export function generateSeasonSummary(
  games: Game[],
  results: GameResult[],
): SeasonSummary {
  const completedGames = games.filter(
    (g) => g.status === "COMPLETED" || g.status === "SETTLED",
  ).length;
  const cancelledGames = games.filter((g) => g.status === "CANCELLED").length;
  const totalGames = games.length;
  const cancelRate =
    totalGames > 0
      ? Math.round((cancelledGames / totalGames) * 1000) / 1000
      : 0;

  const record = calculateWinLossRecord(results);

  const validResults = results.filter(
    (r) => r.our_score !== null && r.opponent_score !== null,
  );
  const averageScore =
    validResults.length > 0
      ? Math.round(
          (validResults.reduce((sum, r) => sum + (r.our_score ?? 0), 0) /
            validResults.length) *
            10,
        ) / 10
      : 0;
  const averageOpponentScore =
    validResults.length > 0
      ? Math.round(
          (validResults.reduce((sum, r) => sum + (r.opponent_score ?? 0), 0) /
            validResults.length) *
            10,
        ) / 10
      : 0;

  return {
    totalGames,
    completedGames,
    cancelledGames,
    cancelRate,
    record,
    averageScore,
    averageOpponentScore,
  };
}

/**
 * 月別の統計を生成する
 */
export function generateMonthlyStats(
  games: Game[],
  results: GameResult[],
): MonthlyStats[] {
  const resultMap = new Map(results.map((r) => [r.game_id, r]));
  const monthMap = new Map<string, GameResult[]>();

  for (const game of games) {
    if (!game.game_date) continue;
    const month = game.game_date.slice(0, 7); // YYYY-MM
    const result = resultMap.get(game.id);
    if (!result) continue;

    const existing = monthMap.get(month) ?? [];
    existing.push(result);
    monthMap.set(month, existing);
  }

  return Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, monthResults]) => ({
      month,
      gamesPlayed: monthResults.length,
      record: calculateWinLossRecord(monthResults),
    }));
}

/**
 * 連勝/連敗記録を計算する
 */
export function calculateStreak(results: GameResult[]): {
  currentStreak: { type: "WIN" | "LOSE" | "DRAW" | null; count: number };
  longestWinStreak: number;
  longestLoseStreak: number;
} {
  let longestWinStreak = 0;
  let longestLoseStreak = 0;
  let currentWinStreak = 0;
  let currentLoseStreak = 0;

  for (const result of results) {
    if (result.result === "WIN") {
      currentWinStreak++;
      currentLoseStreak = 0;
      longestWinStreak = Math.max(longestWinStreak, currentWinStreak);
    } else if (result.result === "LOSE") {
      currentLoseStreak++;
      currentWinStreak = 0;
      longestLoseStreak = Math.max(longestLoseStreak, currentLoseStreak);
    } else {
      currentWinStreak = 0;
      currentLoseStreak = 0;
    }
  }

  const lastResult = results[results.length - 1];
  let currentStreak: { type: "WIN" | "LOSE" | "DRAW" | null; count: number };

  if (!lastResult || !lastResult.result) {
    currentStreak = { type: null, count: 0 };
  } else if (currentWinStreak > 0) {
    currentStreak = { type: "WIN", count: currentWinStreak };
  } else if (currentLoseStreak > 0) {
    currentStreak = { type: "LOSE", count: currentLoseStreak };
  } else {
    currentStreak = { type: "DRAW", count: 1 };
  }

  return { currentStreak, longestWinStreak, longestLoseStreak };
}
