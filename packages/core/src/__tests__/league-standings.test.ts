import { describe, expect, it } from "vitest";
import { calculateStandings, rankStandings } from "../lib/league-standings";
import { createLeagueMatchFixture } from "../lib/test-fixtures";

describe("calculateStandings", () => {
  const teamIds = ["team-A", "team-B", "team-C"];

  describe("勝敗が明確なとき", () => {
    const matches = [
      createLeagueMatchFixture({
        id: "m1",
        home_team_id: "team-A",
        away_team_id: "team-B",
        status: "COMPLETED",
        home_score: 5,
        away_score: 3,
      }),
      createLeagueMatchFixture({
        id: "m2",
        home_team_id: "team-B",
        away_team_id: "team-C",
        status: "COMPLETED",
        home_score: 2,
        away_score: 2,
      }),
      createLeagueMatchFixture({
        id: "m3",
        home_team_id: "team-A",
        away_team_id: "team-C",
        status: "COMPLETED",
        home_score: 4,
        away_score: 1,
      }),
    ];

    it("勝ち=3点、引き分け=1点、負け=0点で計算する", () => {
      const standings = calculateStandings(matches, teamIds, "league-1");
      const a = standings.find((s) => s.team_id === "team-A")!;
      const b = standings.find((s) => s.team_id === "team-B")!;
      const c = standings.find((s) => s.team_id === "team-C")!;

      expect(a.wins).toBe(2);
      expect(a.points).toBe(6);
      expect(b.draws).toBe(1);
      expect(b.points).toBe(1);
      expect(c.draws).toBe(1);
      expect(c.losses).toBe(1);
      expect(c.points).toBe(1);
    });

    it("得失点を正しく計算する", () => {
      const standings = calculateStandings(matches, teamIds, "league-1");
      const a = standings.find((s) => s.team_id === "team-A")!;
      expect(a.runs_for).toBe(9);
      expect(a.runs_against).toBe(4);
    });

    it("試合数を正しく計算する", () => {
      const standings = calculateStandings(matches, teamIds, "league-1");
      const a = standings.find((s) => s.team_id === "team-A")!;
      const b = standings.find((s) => s.team_id === "team-B")!;
      expect(a.games_played).toBe(2);
      expect(b.games_played).toBe(2);
    });
  });

  describe("未完了の試合があるとき", () => {
    it("COMPLETEDの試合のみ集計する", () => {
      const matches = [
        createLeagueMatchFixture({
          id: "m1",
          home_team_id: "team-A",
          away_team_id: "team-B",
          status: "COMPLETED",
          home_score: 3,
          away_score: 1,
        }),
        createLeagueMatchFixture({
          id: "m2",
          home_team_id: "team-A",
          away_team_id: "team-C",
          status: "SCHEDULED",
        }),
      ];
      const standings = calculateStandings(matches, teamIds);
      const a = standings.find((s) => s.team_id === "team-A")!;
      expect(a.games_played).toBe(1);
    });
  });
});

describe("rankStandings", () => {
  it("勝ち点順にランクを付ける", () => {
    const standings = [
      {
        league_id: "l",
        team_id: "C",
        wins: 0,
        losses: 2,
        draws: 0,
        points: 0,
        runs_for: 2,
        runs_against: 8,
        games_played: 2,
      },
      {
        league_id: "l",
        team_id: "A",
        wins: 2,
        losses: 0,
        draws: 0,
        points: 6,
        runs_for: 8,
        runs_against: 2,
        games_played: 2,
      },
      {
        league_id: "l",
        team_id: "B",
        wins: 1,
        losses: 1,
        draws: 0,
        points: 3,
        runs_for: 5,
        runs_against: 5,
        games_played: 2,
      },
    ];
    const ranked = rankStandings(standings);
    expect(ranked[0].team_id).toBe("A");
    expect(ranked[0].rank).toBe(1);
    expect(ranked[1].team_id).toBe("B");
    expect(ranked[1].rank).toBe(2);
    expect(ranked[2].team_id).toBe("C");
    expect(ranked[2].rank).toBe(3);
  });

  it("勝ち点が同じとき得失点差で順位を決める", () => {
    const standings = [
      {
        league_id: "l",
        team_id: "A",
        wins: 1,
        losses: 0,
        draws: 0,
        points: 3,
        runs_for: 3,
        runs_against: 2,
        games_played: 1,
      },
      {
        league_id: "l",
        team_id: "B",
        wins: 1,
        losses: 0,
        draws: 0,
        points: 3,
        runs_for: 5,
        runs_against: 1,
        games_played: 1,
      },
    ];
    const ranked = rankStandings(standings);
    expect(ranked[0].team_id).toBe("B");
  });
});
