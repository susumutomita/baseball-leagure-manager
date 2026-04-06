import { describe, expect, it } from "vitest";
import {
  canLeagueTransition,
  canLeagueTransitionWithContext,
  getAvailableLeagueTransitions,
} from "../lib/league-state-machine";

describe("canLeagueTransition", () => {
  it("DRAFTからRECRUITINGに遷移できる", () => {
    expect(canLeagueTransition("DRAFT", "RECRUITING")).toBe(true);
  });

  it("DRAFTからCANCELLEDに遷移できる", () => {
    expect(canLeagueTransition("DRAFT", "CANCELLED")).toBe(true);
  });

  it("RECRUITINGからIN_PROGRESSに遷移できる", () => {
    expect(canLeagueTransition("RECRUITING", "IN_PROGRESS")).toBe(true);
  });

  it("IN_PROGRESSからCOMPLETEDに遷移できる", () => {
    expect(canLeagueTransition("IN_PROGRESS", "COMPLETED")).toBe(true);
  });

  it("COMPLETEDからは遷移できない", () => {
    expect(canLeagueTransition("COMPLETED", "DRAFT")).toBe(false);
    expect(canLeagueTransition("COMPLETED", "CANCELLED")).toBe(false);
  });

  it("CANCELLEDからは遷移できない", () => {
    expect(canLeagueTransition("CANCELLED", "DRAFT")).toBe(false);
  });

  it("DRAFTから直接IN_PROGRESSには遷移できない", () => {
    expect(canLeagueTransition("DRAFT", "IN_PROGRESS")).toBe(false);
  });
});

describe("getAvailableLeagueTransitions", () => {
  it("DRAFTから利用可能な遷移を返す", () => {
    const transitions = getAvailableLeagueTransitions("DRAFT");
    expect(transitions).toContain("RECRUITING");
    expect(transitions).toContain("CANCELLED");
    expect(transitions).toHaveLength(2);
  });
});

describe("canLeagueTransitionWithContext", () => {
  describe("RECRUITING → IN_PROGRESSのとき", () => {
    it("2チーム以上で許可する", () => {
      const result = canLeagueTransitionWithContext(
        "RECRUITING",
        "IN_PROGRESS",
        { accepted_team_count: 4 },
      );
      expect(result.allowed).toBe(true);
    });

    it("2チーム未満で拒否する", () => {
      const result = canLeagueTransitionWithContext(
        "RECRUITING",
        "IN_PROGRESS",
        { accepted_team_count: 1 },
      );
      expect(result.allowed).toBe(false);
      expect(result.reason).toContain("2チーム以上");
    });
  });

  it("無効な遷移を拒否する", () => {
    const result = canLeagueTransitionWithContext("DRAFT", "IN_PROGRESS", {
      accepted_team_count: 5,
    });
    expect(result.allowed).toBe(false);
  });
});
