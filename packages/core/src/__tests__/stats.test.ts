import { describe, expect, it } from "vitest";
import {
  calculateBattingStats,
  calculatePitchingStats,
  calculateTeamStats,
} from "../lib/stats";

// ファクトリ関数
function createAtBat(
  overrides: Partial<{
    result: string;
    rbi: number;
    runs_scored: boolean;
    stolen_base: boolean;
  }> = {},
) {
  return {
    result: "SINGLE",
    rbi: 0,
    runs_scored: false,
    stolen_base: false,
    ...overrides,
  };
}

function createPitchingStat(
  overrides: Partial<{
    innings_pitched: number;
    earned_runs: number;
    hits_allowed: number;
    walks: number;
    strikeouts: number;
    home_runs_allowed: number;
    is_winning_pitcher: boolean;
    is_losing_pitcher: boolean;
  }> = {},
) {
  return {
    innings_pitched: 7,
    earned_runs: 0,
    hits_allowed: 0,
    walks: 0,
    strikeouts: 0,
    home_runs_allowed: 0,
    is_winning_pitcher: false,
    is_losing_pitcher: false,
    ...overrides,
  };
}

function createGameResult(
  overrides: Partial<{
    result: string | null;
    our_score: number | null;
    opponent_score: number | null;
  }> = {},
) {
  return {
    result: "WIN",
    our_score: 5,
    opponent_score: 3,
    ...overrides,
  };
}

describe("calculateBattingStats", () => {
  it("打席がないとき全て0を返す", () => {
    const stats = calculateBattingStats([], 0);
    expect(stats.avg).toBe(0);
    expect(stats.obp).toBe(0);
    expect(stats.slg).toBe(0);
    expect(stats.ops).toBe(0);
    expect(stats.plateAppearances).toBe(0);
    expect(stats.atBats).toBe(0);
    expect(stats.hits).toBe(0);
    expect(stats.homeRuns).toBe(0);
    expect(stats.rbi).toBe(0);
    expect(stats.stolenBases).toBe(0);
  });

  it("打撃成績を正しく集計する", () => {
    const atBats = [
      createAtBat({ result: "SINGLE", rbi: 1, runs_scored: true }),
      createAtBat({ result: "DOUBLE", rbi: 2 }),
      createAtBat({ result: "STRIKEOUT" }),
      createAtBat({ result: "WALK", stolen_base: true }),
      createAtBat({ result: "FLY_OUT" }),
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
      createAtBat({ result: "HOMERUN", rbi: 4, runs_scored: true }),
      createAtBat({ result: "GROUND_OUT" }),
    ];
    const stats = calculateBattingStats(atBats, 1);
    expect(stats.avg).toBe(0.5);
    expect(stats.slg).toBe(2.0); // 4/2
  });

  describe("全打席が四球のとき", () => {
    it("打率0・出塁率1.0を返す", () => {
      const atBats = [
        createAtBat({ result: "WALK" }),
        createAtBat({ result: "WALK" }),
        createAtBat({ result: "WALK" }),
      ];
      const stats = calculateBattingStats(atBats, 1);
      expect(stats.atBats).toBe(0);
      expect(stats.avg).toBe(0); // 0打数なので打率0
      expect(stats.obp).toBe(1.0); // 3/3 = 1.0
      expect(stats.slg).toBe(0); // 0打数なので長打率0
      expect(stats.walks).toBe(3);
    });
  });

  describe("パーフェクト打撃のとき", () => {
    it("打率1.000を返す", () => {
      const atBats = [
        createAtBat({ result: "SINGLE", rbi: 1 }),
        createAtBat({ result: "DOUBLE", rbi: 2 }),
        createAtBat({ result: "TRIPLE", rbi: 1 }),
        createAtBat({ result: "HOMERUN", rbi: 4 }),
      ];
      const stats = calculateBattingStats(atBats, 1);
      expect(stats.avg).toBe(1.0);
      expect(stats.hits).toBe(4);
      expect(stats.singles).toBe(1);
      expect(stats.doubles).toBe(1);
      expect(stats.triples).toBe(1);
      expect(stats.homeRuns).toBe(1);
      expect(stats.obp).toBe(1.0);
      expect(stats.slg).toBe(2.5); // (1+2+3+4)/4
      expect(stats.ops).toBe(3.5); // 1.0 + 2.5
      expect(stats.rbi).toBe(8);
    });
  });

  describe("死球が含まれるとき", () => {
    it("打数から除外し出塁率に含める", () => {
      const atBats = [
        createAtBat({ result: "HIT_BY_PITCH" }),
        createAtBat({ result: "SINGLE", rbi: 1 }),
        createAtBat({ result: "GROUND_OUT" }),
      ];
      const stats = calculateBattingStats(atBats, 1);
      expect(stats.plateAppearances).toBe(3);
      expect(stats.atBats).toBe(2); // HBPは打数除外
      expect(stats.hitByPitch).toBe(1);
      expect(stats.avg).toBe(0.5); // 1/2
      expect(stats.obp).toBe(0.667); // (1+0+1)/3 = round3(0.6667)
    });
  });

  describe("犠打・犠飛が含まれるとき", () => {
    it("打数から除外する", () => {
      const atBats = [
        createAtBat({ result: "SAC_BUNT", rbi: 0 }),
        createAtBat({ result: "SAC_FLY", rbi: 1 }),
        createAtBat({ result: "SINGLE", rbi: 0 }),
        createAtBat({ result: "STRIKEOUT" }),
      ];
      const stats = calculateBattingStats(atBats, 1);
      expect(stats.plateAppearances).toBe(4);
      expect(stats.atBats).toBe(2); // SAC_BUNT, SAC_FLYは除外
      expect(stats.sacBunts).toBe(1);
      expect(stats.sacFlies).toBe(1);
      expect(stats.avg).toBe(0.5); // 1/2
    });
  });

  describe("得点と盗塁の集計", () => {
    it("正しくカウントする", () => {
      const atBats = [
        createAtBat({ result: "SINGLE", runs_scored: true, stolen_base: true }),
        createAtBat({
          result: "DOUBLE",
          runs_scored: true,
          stolen_base: false,
        }),
        createAtBat({ result: "GROUND_OUT", runs_scored: false }),
      ];
      const stats = calculateBattingStats(atBats, 2);
      expect(stats.runsScored).toBe(2);
      expect(stats.stolenBases).toBe(1);
      expect(stats.games).toBe(2);
    });
  });

  describe("三振のみのとき", () => {
    it("打率0・出塁率0を返す", () => {
      const atBats = [
        createAtBat({ result: "STRIKEOUT" }),
        createAtBat({ result: "STRIKEOUT" }),
        createAtBat({ result: "STRIKEOUT" }),
      ];
      const stats = calculateBattingStats(atBats, 1);
      expect(stats.avg).toBe(0);
      expect(stats.obp).toBe(0);
      expect(stats.slg).toBe(0);
      expect(stats.ops).toBe(0);
      expect(stats.strikeouts).toBe(3);
    });
  });
});

describe("calculatePitchingStats", () => {
  it("登板がないとき全て0を返す", () => {
    const stats = calculatePitchingStats([]);
    expect(stats.era).toBe(0);
    expect(stats.whip).toBe(0);
    expect(stats.games).toBe(0);
    expect(stats.wins).toBe(0);
    expect(stats.losses).toBe(0);
    expect(stats.strikeouts).toBe(0);
    expect(stats.k9).toBe(0);
    expect(stats.bb9).toBe(0);
  });

  it("投球成績を正しく集計する", () => {
    const stats = calculatePitchingStats([
      createPitchingStat({
        innings_pitched: 7,
        earned_runs: 2,
        hits_allowed: 5,
        walks: 3,
        strikeouts: 8,
        home_runs_allowed: 1,
        is_winning_pitcher: true,
      }),
    ]);
    expect(stats.games).toBe(1);
    expect(stats.wins).toBe(1);
    expect(stats.era).toBe(2); // (2/7)*7
    expect(stats.whip).toBe(1.14); // (5+3)/7
    expect(stats.strikeouts).toBe(8);
  });

  describe("完封投球のとき", () => {
    it("ERA 0.00を返す", () => {
      const stats = calculatePitchingStats([
        createPitchingStat({
          innings_pitched: 7,
          earned_runs: 0,
          hits_allowed: 3,
          walks: 1,
          strikeouts: 10,
          is_winning_pitcher: true,
        }),
      ]);
      expect(stats.era).toBe(0);
      expect(stats.whip).toBe(0.57); // (3+1)/7 = 0.571...
      expect(stats.wins).toBe(1);
      expect(stats.losses).toBe(0);
      expect(stats.strikeouts).toBe(10);
    });
  });

  describe("複数登板の集計のとき", () => {
    it("合計で正しく計算する", () => {
      const stats = calculatePitchingStats([
        createPitchingStat({
          innings_pitched: 7,
          earned_runs: 1,
          hits_allowed: 4,
          walks: 2,
          strikeouts: 6,
          is_winning_pitcher: true,
        }),
        createPitchingStat({
          innings_pitched: 7,
          earned_runs: 3,
          hits_allowed: 6,
          walks: 4,
          strikeouts: 4,
          is_losing_pitcher: true,
        }),
      ]);
      expect(stats.games).toBe(2);
      expect(stats.inningsPitched).toBe(14);
      expect(stats.earnedRuns).toBe(4);
      expect(stats.era).toBe(2); // (4/14)*7 = 2.0
      expect(stats.whip).toBe(1.14); // (10+6)/14 = 1.142...
      expect(stats.wins).toBe(1);
      expect(stats.losses).toBe(1);
      expect(stats.strikeouts).toBe(10);
    });
  });

  describe("K/9とBB/9の計算のとき", () => {
    it("正しい奪三振率・与四球率を返す", () => {
      const stats = calculatePitchingStats([
        createPitchingStat({
          innings_pitched: 9,
          earned_runs: 0,
          hits_allowed: 0,
          walks: 3,
          strikeouts: 9,
        }),
      ]);
      expect(stats.k9).toBe(9.0); // (9/9)*9
      expect(stats.bb9).toBe(3.0); // (3/9)*9
    });
  });

  describe("大量失点の登板のとき", () => {
    it("高いERAを返す", () => {
      const stats = calculatePitchingStats([
        createPitchingStat({
          innings_pitched: 1,
          earned_runs: 10,
          hits_allowed: 8,
          walks: 5,
          is_losing_pitcher: true,
        }),
      ]);
      expect(stats.era).toBe(70); // (10/1)*7
      expect(stats.whip).toBe(13); // (8+5)/1
      expect(stats.losses).toBe(1);
    });
  });
});

describe("calculateTeamStats", () => {
  it("試合結果がないとき全て0を返す", () => {
    const stats = calculateTeamStats([]);
    expect(stats.totalGames).toBe(0);
    expect(stats.winRate).toBe(0);
    expect(stats.wins).toBe(0);
    expect(stats.losses).toBe(0);
    expect(stats.draws).toBe(0);
    expect(stats.totalRunsScored).toBe(0);
    expect(stats.totalRunsAllowed).toBe(0);
    expect(stats.runDifferential).toBe(0);
  });

  it("チーム統計を正しく集計する", () => {
    const stats = calculateTeamStats([
      createGameResult({ result: "WIN", our_score: 5, opponent_score: 3 }),
      createGameResult({ result: "WIN", our_score: 7, opponent_score: 2 }),
      createGameResult({ result: "LOSE", our_score: 1, opponent_score: 4 }),
      createGameResult({ result: "DRAW", our_score: 3, opponent_score: 3 }),
    ]);
    expect(stats.totalGames).toBe(4);
    expect(stats.wins).toBe(2);
    expect(stats.losses).toBe(1);
    expect(stats.draws).toBe(1);
    expect(stats.winRate).toBe(0.667);
    expect(stats.runDifferential).toBe(4); // 16-12
  });

  describe("全勝のとき", () => {
    it("勝率1.000を返す", () => {
      const stats = calculateTeamStats([
        createGameResult({ result: "WIN", our_score: 10, opponent_score: 0 }),
        createGameResult({ result: "WIN", our_score: 5, opponent_score: 3 }),
        createGameResult({ result: "WIN", our_score: 7, opponent_score: 1 }),
      ]);
      expect(stats.winRate).toBe(1.0);
      expect(stats.wins).toBe(3);
      expect(stats.losses).toBe(0);
      expect(stats.totalRunsScored).toBe(22);
      expect(stats.totalRunsAllowed).toBe(4);
      expect(stats.runDifferential).toBe(18);
    });
  });

  describe("全敗のとき", () => {
    it("勝率0.000を返す", () => {
      const stats = calculateTeamStats([
        createGameResult({ result: "LOSE", our_score: 0, opponent_score: 5 }),
        createGameResult({ result: "LOSE", our_score: 1, opponent_score: 10 }),
      ]);
      expect(stats.winRate).toBe(0);
      expect(stats.wins).toBe(0);
      expect(stats.losses).toBe(2);
      expect(stats.runDifferential).toBe(-14);
    });
  });

  describe("引き分けのみのとき", () => {
    it("勝率0を返す (勝ち負けなし)", () => {
      const stats = calculateTeamStats([
        createGameResult({ result: "DRAW", our_score: 3, opponent_score: 3 }),
        createGameResult({ result: "DRAW", our_score: 0, opponent_score: 0 }),
      ]);
      expect(stats.winRate).toBe(0); // 0勝0敗 → 0
      expect(stats.draws).toBe(2);
      expect(stats.runDifferential).toBe(0);
    });
  });

  describe("スコアがnullの試合があるとき", () => {
    it("nullを0として扱い集計する", () => {
      const stats = calculateTeamStats([
        createGameResult({
          result: "WIN",
          our_score: null,
          opponent_score: null,
        }),
        createGameResult({ result: "WIN", our_score: 5, opponent_score: 3 }),
      ]);
      expect(stats.totalGames).toBe(2);
      expect(stats.totalRunsScored).toBe(5); // null → 0
      expect(stats.totalRunsAllowed).toBe(3);
    });
  });
});
