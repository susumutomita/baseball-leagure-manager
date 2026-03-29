import { describe, expect, it } from "bun:test";
import {
  InvalidTransitionError,
  assertNegotiationTransition,
  assertTransition,
  canNegotiationTransition,
  canTransition,
  getAvailableTransitions,
} from "../lib/state-machine";

describe("MatchRequest ステートマシン", () => {
  describe("canTransition", () => {
    describe("DRAFT状態のとき", () => {
      it("OPENに遷移できる", () => {
        expect(canTransition("DRAFT", "OPEN")).toBe(true);
      });

      it("CANCELLEDに遷移できる", () => {
        expect(canTransition("DRAFT", "CANCELLED")).toBe(true);
      });

      it("CONFIRMEDには遷移できない", () => {
        expect(canTransition("DRAFT", "CONFIRMED")).toBe(false);
      });

      it("NEGOTIATINGには遷移できない", () => {
        expect(canTransition("DRAFT", "NEGOTIATING")).toBe(false);
      });
    });

    describe("OPEN状態のとき", () => {
      it("MATCH_CANDIDATE_FOUNDに遷移できる", () => {
        expect(canTransition("OPEN", "MATCH_CANDIDATE_FOUND")).toBe(true);
      });

      it("CANCELLEDに遷移できる", () => {
        expect(canTransition("OPEN", "CANCELLED")).toBe(true);
      });

      it("FAILEDに遷移できる", () => {
        expect(canTransition("OPEN", "FAILED")).toBe(true);
      });

      it("DRAFTには戻れない", () => {
        expect(canTransition("OPEN", "DRAFT")).toBe(false);
      });
    });

    describe("NEGOTIATING状態のとき", () => {
      it("GROUND_WAITINGに遷移できる", () => {
        expect(canTransition("NEGOTIATING", "GROUND_WAITING")).toBe(true);
      });

      it("交渉不成立でOPENに戻れる", () => {
        expect(canTransition("NEGOTIATING", "OPEN")).toBe(true);
      });

      it("CANCELLEDに遷移できる", () => {
        expect(canTransition("NEGOTIATING", "CANCELLED")).toBe(true);
      });
    });

    describe("READY_TO_CONFIRM状態のとき", () => {
      it("CONFIRMEDに遷移できる", () => {
        expect(canTransition("READY_TO_CONFIRM", "CONFIRMED")).toBe(true);
      });

      it("管理者却下でOPENに戻れる", () => {
        expect(canTransition("READY_TO_CONFIRM", "OPEN")).toBe(true);
      });
    });

    describe("終端状態のとき", () => {
      it("CONFIRMEDからはCANCELLEDのみ遷移できる", () => {
        expect(canTransition("CONFIRMED", "CANCELLED")).toBe(true);
        expect(canTransition("CONFIRMED", "OPEN")).toBe(false);
      });

      it("CANCELLEDからはどこにも遷移できない", () => {
        expect(canTransition("CANCELLED", "OPEN")).toBe(false);
        expect(canTransition("CANCELLED", "DRAFT")).toBe(false);
      });

      it("FAILEDからはどこにも遷移できない", () => {
        expect(canTransition("FAILED", "OPEN")).toBe(false);
        expect(canTransition("FAILED", "DRAFT")).toBe(false);
      });
    });
  });

  describe("assertTransition", () => {
    it("許可された遷移では例外を投げない", () => {
      expect(() => assertTransition("DRAFT", "OPEN")).not.toThrow();
    });

    it("不正な遷移ではInvalidTransitionErrorを投げる", () => {
      expect(() => assertTransition("DRAFT", "CONFIRMED")).toThrow(
        InvalidTransitionError,
      );
    });

    it("エラーメッセージに遷移元と遷移先が含まれる", () => {
      try {
        assertTransition("DRAFT", "CONFIRMED");
      } catch (e) {
        expect((e as Error).message).toContain("DRAFT");
        expect((e as Error).message).toContain("CONFIRMED");
      }
    });
  });

  describe("getAvailableTransitions", () => {
    it("DRAFT状態からの遷移先を返す", () => {
      const transitions = getAvailableTransitions("DRAFT");
      expect(transitions).toContain("OPEN");
      expect(transitions).toContain("CANCELLED");
      expect(transitions).toHaveLength(2);
    });

    it("終端状態では空配列を返す", () => {
      expect(getAvailableTransitions("CANCELLED")).toEqual([]);
      expect(getAvailableTransitions("FAILED")).toEqual([]);
    });
  });
});

describe("Negotiation ステートマシン", () => {
  describe("canNegotiationTransition", () => {
    it("NOT_SENTからSENTに遷移できる", () => {
      expect(canNegotiationTransition("NOT_SENT", "SENT")).toBe(true);
    });

    it("SENTからREPLIEDに遷移できる", () => {
      expect(canNegotiationTransition("SENT", "REPLIED")).toBe(true);
    });

    it("SENTからDECLINEDに遷移できる", () => {
      expect(canNegotiationTransition("SENT", "DECLINED")).toBe(true);
    });

    it("REPLIEDからACCEPTEDに遷移できる", () => {
      expect(canNegotiationTransition("REPLIED", "ACCEPTED")).toBe(true);
    });

    it("REPLIEDからCOUNTER_PROPOSEDに遷移できる", () => {
      expect(canNegotiationTransition("REPLIED", "COUNTER_PROPOSED")).toBe(
        true,
      );
    });

    it("ACCEPTEDからはどこにも遷移できない", () => {
      expect(canNegotiationTransition("ACCEPTED", "SENT")).toBe(false);
      expect(canNegotiationTransition("ACCEPTED", "DECLINED")).toBe(false);
    });

    it("DECLINEDからはどこにも遷移できない", () => {
      expect(canNegotiationTransition("DECLINED", "SENT")).toBe(false);
    });

    it("NOT_SENTからACCEPTEDには直接遷移できない", () => {
      expect(canNegotiationTransition("NOT_SENT", "ACCEPTED")).toBe(false);
    });
  });

  describe("assertNegotiationTransition", () => {
    it("許可された遷移では例外を投げない", () => {
      expect(() =>
        assertNegotiationTransition("NOT_SENT", "SENT"),
      ).not.toThrow();
    });

    it("不正な遷移では例外を投げる", () => {
      expect(() =>
        assertNegotiationTransition("NOT_SENT", "ACCEPTED"),
      ).toThrow();
    });
  });
});
