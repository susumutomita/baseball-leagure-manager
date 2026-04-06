import { describe, expect, it } from "vitest";
import {
  calculateStreak,
  calculateWinLossRecord,
  generateMonthlyStats,
  generateSeasonSummary,
} from "../lib/game-analytics";
import type { Game, GameResult } from "../types/domain";

function createGame(overrides: Partial<Game> = {}): Game {
  return {
    id: "game-1",
    team_id: "team-1",
    title: "テスト試合",
    game_type: "FRIENDLY",
    status: "COMPLETED",
    game_date: "2026-05-01",
    start_time: "09:00",
    end_time: "12:00",
    ground_id: null,
    ground_name: null,
    opponent_team_id: null,
    min_players: 9,
    rsvp_deadline: null,
    note: null,
    version: 0,
    available_count: 0,
    unavailable_count: 0,
    maybe_count: 0,
    no_response_count: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function createResult(overrides: Partial<GameResult> = {}): GameResult {
  return {
    id: "result-1",
    game_id: "game-1",
    our_score: 5,
    opponent_score: 3,
    result: "WIN",
    innings: 7,
    note: null,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("calculateWinLossRecord", () => {
  it("勝敗を正しく集計する", () => {
    const results = [
      createResult({ id: "r-1", result: "WIN" }),
      createResult({ id: "r-2", result: "WIN" }),
      createResult({ id: "r-3", result: "LOSE" }),
      createResult({ id: "r-4", result: "DRAW" }),
    ];
    const record = calculateWinLossRecord(results);
    expect(record.wins).toBe(2);
    expect(record.losses).toBe(1);
    expect(record.draws).toBe(1);
    expect(record.total).toBe(4);
    expect(record.winRate).toBe(0.5);
  });

  it("結果がないとき全て0を返す", () => {
    const record = calculateWinLossRecord([]);
    expect(record.total).toBe(0);
    expect(record.winRate).toBe(0);
  });
});

describe("generateSeasonSummary", () => {
  it("シーズンサマリーを正しく生成する", () => {
    const games = [
      createGame({ id: "g-1", status: "COMPLETED" }),
      createGame({ id: "g-2", status: "SETTLED" }),
      createGame({ id: "g-3", status: "CANCELLED" }),
      createGame({ id: "g-4", status: "COLLECTING" }),
    ];
    const results = [
      createResult({
        id: "r-1",
        game_id: "g-1",
        our_score: 5,
        opponent_score: 3,
        result: "WIN",
      }),
      createResult({
        id: "r-2",
        game_id: "g-2",
        our_score: 2,
        opponent_score: 4,
        result: "LOSE",
      }),
    ];
    const summary = generateSeasonSummary(games, results);

    expect(summary.totalGames).toBe(4);
    expect(summary.completedGames).toBe(2);
    expect(summary.cancelledGames).toBe(1);
    expect(summary.cancelRate).toBe(0.25);
    expect(summary.record.wins).toBe(1);
    expect(summary.record.losses).toBe(1);
    expect(summary.averageScore).toBe(3.5);
    expect(summary.averageOpponentScore).toBe(3.5);
  });
});

describe("generateMonthlyStats", () => {
  it("月別に集計する", () => {
    const games = [
      createGame({ id: "g-1", game_date: "2026-04-15" }),
      createGame({ id: "g-2", game_date: "2026-04-22" }),
      createGame({ id: "g-3", game_date: "2026-05-01" }),
    ];
    const results = [
      createResult({ id: "r-1", game_id: "g-1", result: "WIN" }),
      createResult({ id: "r-2", game_id: "g-2", result: "LOSE" }),
      createResult({ id: "r-3", game_id: "g-3", result: "WIN" }),
    ];
    const monthly = generateMonthlyStats(games, results);

    expect(monthly).toHaveLength(2);
    expect(monthly[0]?.month).toBe("2026-04");
    expect(monthly[0]?.gamesPlayed).toBe(2);
    expect(monthly[1]?.month).toBe("2026-05");
    expect(monthly[1]?.gamesPlayed).toBe(1);
  });
});

describe("calculateStreak", () => {
  it("連勝記録を計算する", () => {
    const results = [
      createResult({ id: "r-1", result: "WIN" }),
      createResult({ id: "r-2", result: "WIN" }),
      createResult({ id: "r-3", result: "WIN" }),
      createResult({ id: "r-4", result: "LOSE" }),
      createResult({ id: "r-5", result: "WIN" }),
    ];
    const streak = calculateStreak(results);
    expect(streak.longestWinStreak).toBe(3);
    expect(streak.longestLoseStreak).toBe(1);
    expect(streak.currentStreak).toEqual({ type: "WIN", count: 1 });
  });

  it("連敗中のとき", () => {
    const results = [
      createResult({ id: "r-1", result: "WIN" }),
      createResult({ id: "r-2", result: "LOSE" }),
      createResult({ id: "r-3", result: "LOSE" }),
    ];
    const streak = calculateStreak(results);
    expect(streak.currentStreak).toEqual({ type: "LOSE", count: 2 });
  });

  it("結果がないとき", () => {
    const streak = calculateStreak([]);
    expect(streak.currentStreak).toEqual({ type: null, count: 0 });
    expect(streak.longestWinStreak).toBe(0);
  });
});
