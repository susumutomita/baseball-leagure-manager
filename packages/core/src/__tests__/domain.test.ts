import { describe, expect, it } from "bun:test";
import {
  GAME_STATUSES,
  GAME_TYPES,
  HELPER_REQUEST_STATUSES,
  MEMBER_TIERS,
  NEGOTIATION_STATUSES,
  RSVP_RESPONSES,
} from "../types/domain";

describe("ドメイン定数", () => {
  describe("GAME_STATUSES", () => {
    it("8つの状態を持つ", () => {
      expect(GAME_STATUSES).toHaveLength(8);
    });

    it("DRAFTで始まりCANCELLEDで終わる", () => {
      expect(GAME_STATUSES[0]).toBe("DRAFT");
      expect(GAME_STATUSES[GAME_STATUSES.length - 1]).toBe("CANCELLED");
    });

    it("新しいライフサイクル順に並んでいる", () => {
      expect([...GAME_STATUSES]).toEqual([
        "DRAFT",
        "COLLECTING",
        "ASSESSING",
        "ARRANGING",
        "CONFIRMED",
        "COMPLETED",
        "SETTLED",
        "CANCELLED",
      ]);
    });
  });

  describe("GAME_TYPES", () => {
    it("4つの種別を持つ", () => {
      expect(GAME_TYPES).toHaveLength(4);
    });

    it("PRACTICE, FRIENDLY, LEAGUE, TOURNAMENTを含む", () => {
      expect([...GAME_TYPES]).toEqual([
        "PRACTICE",
        "FRIENDLY",
        "LEAGUE",
        "TOURNAMENT",
      ]);
    });
  });

  describe("RSVP_RESPONSES", () => {
    it("4つの回答種別を持つ", () => {
      expect(RSVP_RESPONSES).toHaveLength(4);
    });

    it("AVAILABLE, UNAVAILABLE, MAYBE, NO_RESPONSEを含む", () => {
      expect([...RSVP_RESPONSES]).toEqual([
        "AVAILABLE",
        "UNAVAILABLE",
        "MAYBE",
        "NO_RESPONSE",
      ]);
    });
  });

  describe("NEGOTIATION_STATUSES", () => {
    it("6つの状態を持つ", () => {
      expect(NEGOTIATION_STATUSES).toHaveLength(6);
    });

    it("DRAFTで始まりCANCELLEDで終わる", () => {
      expect(NEGOTIATION_STATUSES[0]).toBe("DRAFT");
      expect(NEGOTIATION_STATUSES[NEGOTIATION_STATUSES.length - 1]).toBe(
        "CANCELLED",
      );
    });
  });

  describe("HELPER_REQUEST_STATUSES", () => {
    it("4つの状態を持つ", () => {
      expect(HELPER_REQUEST_STATUSES).toHaveLength(4);
    });

    it("PENDING, ACCEPTED, DECLINED, CANCELLEDの順", () => {
      expect([...HELPER_REQUEST_STATUSES]).toEqual([
        "PENDING",
        "ACCEPTED",
        "DECLINED",
        "CANCELLED",
      ]);
    });
  });

  describe("MEMBER_TIERS", () => {
    it("2つの区分を持つ", () => {
      expect(MEMBER_TIERS).toHaveLength(2);
    });

    it("PRO, LITEを含む", () => {
      expect([...MEMBER_TIERS]).toEqual(["PRO", "LITE"]);
    });
  });
});
