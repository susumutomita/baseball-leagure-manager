import { describe, expect, it } from "bun:test";
import {
  AVAILABILITY_RESPONSES,
  LEVEL_BANDS,
  MATCH_REQUEST_STATUSES,
  NEGOTIATION_STATUSES,
} from "../types/domain";

describe("ドメイン定数", () => {
  describe("MATCH_REQUEST_STATUSES", () => {
    it("9つの状態を持つ", () => {
      expect(MATCH_REQUEST_STATUSES).toHaveLength(9);
    });

    it("DRAFTで始まりFAILEDで終わる", () => {
      expect(MATCH_REQUEST_STATUSES[0]).toBe("DRAFT");
      expect(MATCH_REQUEST_STATUSES[MATCH_REQUEST_STATUSES.length - 1]).toBe(
        "FAILED",
      );
    });
  });

  describe("NEGOTIATION_STATUSES", () => {
    it("6つの状態を持つ", () => {
      expect(NEGOTIATION_STATUSES).toHaveLength(6);
    });

    it("NOT_SENTで始まる", () => {
      expect(NEGOTIATION_STATUSES[0]).toBe("NOT_SENT");
    });
  });

  describe("AVAILABILITY_RESPONSES", () => {
    it("4つの回答種別を持つ", () => {
      expect(AVAILABILITY_RESPONSES).toHaveLength(4);
    });

    it("UNKNOWN, AVAILABLE, UNAVAILABLE, MAYBEを含む", () => {
      expect([...AVAILABILITY_RESPONSES]).toEqual([
        "UNKNOWN",
        "AVAILABLE",
        "UNAVAILABLE",
        "MAYBE",
      ]);
    });
  });

  describe("LEVEL_BANDS", () => {
    it("4つのレベル帯を持つ", () => {
      expect(LEVEL_BANDS).toHaveLength(4);
    });

    it("BEGINNERからCOMPETITIVEまでの順序", () => {
      expect([...LEVEL_BANDS]).toEqual([
        "BEGINNER",
        "INTERMEDIATE",
        "ADVANCED",
        "COMPETITIVE",
      ]);
    });
  });
});
