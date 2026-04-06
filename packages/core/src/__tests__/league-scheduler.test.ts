import { describe, expect, it } from "vitest";
import {
  generateDoubleRoundRobinSchedule,
  generateRoundRobinSchedule,
} from "../lib/league-scheduler";

describe("generateRoundRobinSchedule", () => {
  describe("4チームのとき", () => {
    const teams = ["A", "B", "C", "D"];
    const matches = generateRoundRobinSchedule(teams);

    it("6試合を生成する", () => {
      expect(matches).toHaveLength(6);
    });

    it("全チームが3試合ずつ行う", () => {
      for (const team of teams) {
        const count = matches.filter(
          (m) => m.home_team_id === team || m.away_team_id === team,
        ).length;
        expect(count).toBe(3);
      }
    });

    it("全ての組み合わせが含まれる", () => {
      const pairs = new Set(
        matches.map((m) => [m.home_team_id, m.away_team_id].sort().join("-")),
      );
      expect(pairs.size).toBe(6);
    });
  });

  describe("3チーム（奇数）のとき", () => {
    const teams = ["A", "B", "C"];
    const matches = generateRoundRobinSchedule(teams);

    it("3試合を生成する（BYEを除外）", () => {
      expect(matches).toHaveLength(3);
    });

    it("BYEチームが含まれない", () => {
      for (const m of matches) {
        expect(m.home_team_id).not.toBe("__BYE__");
        expect(m.away_team_id).not.toBe("__BYE__");
      }
    });
  });

  describe("2チームのとき", () => {
    it("1試合を生成する", () => {
      const matches = generateRoundRobinSchedule(["A", "B"]);
      expect(matches).toHaveLength(1);
    });
  });

  describe("1チーム以下のとき", () => {
    it("空配列を返す", () => {
      expect(generateRoundRobinSchedule(["A"])).toHaveLength(0);
      expect(generateRoundRobinSchedule([])).toHaveLength(0);
    });
  });

  describe("6チームのとき", () => {
    const teams = ["A", "B", "C", "D", "E", "F"];
    const matches = generateRoundRobinSchedule(teams);

    it("15試合を生成する", () => {
      expect(matches).toHaveLength(15);
    });

    it("match_numberが連番になる", () => {
      const numbers = matches.map((m) => m.match_number);
      expect(numbers).toEqual(Array.from({ length: 15 }, (_, i) => i + 1));
    });
  });
});

describe("generateDoubleRoundRobinSchedule", () => {
  describe("4チームのとき", () => {
    const teams = ["A", "B", "C", "D"];
    const matches = generateDoubleRoundRobinSchedule(teams);

    it("12試合を生成する（ラウンドロビンの2倍）", () => {
      expect(matches).toHaveLength(12);
    });

    it("各対戦がホーム・アウェイの2試合ずつ含まれる", () => {
      for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
          const a = teams[i];
          const b = teams[j];
          const homeAway = matches.filter(
            (m) => m.home_team_id === a && m.away_team_id === b,
          );
          const awayHome = matches.filter(
            (m) => m.home_team_id === b && m.away_team_id === a,
          );
          expect(homeAway.length + awayHome.length).toBe(2);
        }
      }
    });
  });
});
