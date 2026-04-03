import { describe, expect, it } from "bun:test";
import {
  calculateBattingStats,
  calculatePitchingStats,
  calculateTeamStats,
} from "../lib/stats";

describe("calculateBattingStats", () => {
  it("打席がないとき全て0を返す", () => {
    const stats = calculateBattingStats([], 0);
    expect(stats.avg).toBe(0);
    expect(stats.obp).toBe(0);
    expect(stats.ops).toBe(0);
  });

  it("打撃成績を正しく集計する", () => {
    const atBats = [
      { result: "SINGLE", rbi: 1, runs_scored: true, stolen_base: false },
      { result: "DOUBLE", rbi: 2, runs_scored: false, stolen_base: false },
      { result: "STRIKEOUT", rbi: 0, runs_scored: false, stolen_base: false },
      { result: "WALK", rbi: 0, runs_scored: false, stolen_base: true },
      { result: "FLY_OUT", rbi: 0, runs_scored: false, stolen_base: false },
    ];
    const stats = calculateBattingStats(atBats, 1);

    expect(stats.plateAppearances).toBe(5);
    expect(stats.atBats).toBe(4); // 5 - 1 walk
    expect(stats.hits).toBe(2);
    expect(stats.avg).toBe(0.5); // 2/4
    expect(stats.rbi).toBe(3);
    expect(stats.stolenBases).toBe(1);
    expect(stats.obp).toBeGreaterThan(0.5);
    expect(stats.slg).toBeGreaterThan(0.5);
  });

  it("本塁打の長打率を正しく計算する", () => {
    const atBats = [
      { result: "HOMERUN", rbi: 4, runs_scored: true, stolen_base: false },
      { result: "GROUND_OUT", rbi: 0, runs_scored: false, stolen_base: false },
    ];
    const stats = calculateBattingStats(atBats, 1);
    expect(stats.avg).toBe(0.5);
    expect(stats.slg).toBe(2.0); // 4/2
  });
});

describe("calculatePitchingStats", () => {
  it("登板がないとき全て0を返す", () => {
    const stats = calculatePitchingStats([]);
    expect(stats.era).toBe(0);
    expect(stats.whip).toBe(0);
  });

  it("投球成績を正しく集計する", () => {
    const stats = calculatePitchingStats([
      {
        innings_pitched: 7,
        earned_runs: 2,
        hits_allowed: 5,
        walks: 3,
        strikeouts: 8,
        home_runs_allowed: 1,
        is_winning_pitcher: true,
        is_losing_pitcher: false,
      },
    ]);
    expect(stats.games).toBe(1);
    expect(stats.wins).toBe(1);
    expect(stats.era).toBe(2); // (2/7)*7
    expect(stats.whip).toBe(1.14); // (5+3)/7
    expect(stats.strikeouts).toBe(8);
  });
});

describe("calculateTeamStats", () => {
  it("試合結果がないとき全て0を返す", () => {
    const stats = calculateTeamStats([]);
    expect(stats.totalGames).toBe(0);
    expect(stats.winRate).toBe(0);
  });

  it("チーム統計を正しく集計する", () => {
    const stats = calculateTeamStats([
      { result: "WIN", our_score: 5, opponent_score: 3 },
      { result: "WIN", our_score: 7, opponent_score: 2 },
      { result: "LOSE", our_score: 1, opponent_score: 4 },
      { result: "DRAW", our_score: 3, opponent_score: 3 },
    ]);
    expect(stats.totalGames).toBe(4);
    expect(stats.wins).toBe(2);
    expect(stats.losses).toBe(1);
    expect(stats.draws).toBe(1);
    expect(stats.winRate).toBe(0.667);
    expect(stats.runDifferential).toBe(4); // 16-12
  });
});
