import { describe, expect, it } from "bun:test";
import {
  InvalidTransitionError,
  assertHelperRequestTransition,
  assertNegotiationTransition,
  assertTransition,
  canHelperRequestTransition,
  canNegotiationTransition,
  canTransition,
  getAvailableTransitions,
} from "../lib/state-machine";

describe("Game ステートマシン", () => {
  describe("canTransition", () => {
    describe("DRAFT状態のとき", () => {
      it("COLLECTINGに遷移できる", () => {
        expect(canTransition("DRAFT", "COLLECTING")).toBe(true);
      });

      it("練習の場合CONFIRMEDに直接遷移できる", () => {
        expect(canTransition("DRAFT", "CONFIRMED")).toBe(true);
      });

      it("CANCELLEDに遷移できる", () => {
        expect(canTransition("DRAFT", "CANCELLED")).toBe(true);
      });

      it("COMPLETEDには遷移できない", () => {
        expect(canTransition("DRAFT", "COMPLETED")).toBe(false);
      });
    });

    describe("COLLECTING状態のとき", () => {
      it("CONFIRMEDに遷移できる", () => {
        expect(canTransition("COLLECTING", "CONFIRMED")).toBe(true);
      });

      it("CANCELLEDに遷移できる", () => {
        expect(canTransition("COLLECTING", "CANCELLED")).toBe(true);
      });

      it("DRAFTには戻れない", () => {
        expect(canTransition("COLLECTING", "DRAFT")).toBe(false);
      });
    });

    describe("CONFIRMED状態のとき", () => {
      it("COMPLETEDに遷移できる", () => {
        expect(canTransition("CONFIRMED", "COMPLETED")).toBe(true);
      });

      it("CANCELLEDに遷移できる", () => {
        expect(canTransition("CONFIRMED", "CANCELLED")).toBe(true);
      });
    });

    describe("COMPLETED状態のとき", () => {
      it("SETTLEDに遷移できる", () => {
        expect(canTransition("COMPLETED", "SETTLED")).toBe(true);
      });

      it("CANCELLEDには遷移できない", () => {
        expect(canTransition("COMPLETED", "CANCELLED")).toBe(false);
      });
    });

    describe("終端状態のとき", () => {
      it("SETTLEDからはどこにも遷移できない", () => {
        expect(canTransition("SETTLED", "DRAFT")).toBe(false);
        expect(canTransition("SETTLED", "CANCELLED")).toBe(false);
      });

      it("CANCELLEDからはどこにも遷移できない", () => {
        expect(canTransition("CANCELLED", "DRAFT")).toBe(false);
        expect(canTransition("CANCELLED", "COLLECTING")).toBe(false);
      });
    });
  });

  describe("assertTransition", () => {
    it("許可された遷移では例外を投げない", () => {
      expect(() => assertTransition("DRAFT", "COLLECTING")).not.toThrow();
    });

    it("不正な遷移ではInvalidTransitionErrorを投げる", () => {
      expect(() => assertTransition("DRAFT", "SETTLED")).toThrow(
        InvalidTransitionError,
      );
    });

    it("エラーメッセージに遷移元と遷移先が含まれる", () => {
      try {
        assertTransition("DRAFT", "SETTLED");
      } catch (e) {
        expect((e as Error).message).toContain("DRAFT");
        expect((e as Error).message).toContain("SETTLED");
      }
    });
  });

  describe("getAvailableTransitions", () => {
    it("DRAFT状態からの遷移先を返す", () => {
      const transitions = getAvailableTransitions("DRAFT");
      expect(transitions).toContain("COLLECTING");
      expect(transitions).toContain("CONFIRMED");
      expect(transitions).toContain("CANCELLED");
      expect(transitions).toHaveLength(3);
    });

    it("COLLECTING状態からの遷移先を返す", () => {
      const transitions = getAvailableTransitions("COLLECTING");
      expect(transitions).toContain("CONFIRMED");
      expect(transitions).toContain("CANCELLED");
      expect(transitions).toHaveLength(2);
    });

    it("終端状態では空配列を返す", () => {
      expect(getAvailableTransitions("CANCELLED")).toEqual([]);
      expect(getAvailableTransitions("SETTLED")).toEqual([]);
    });
  });
});

describe("Negotiation ステートマシン", () => {
  describe("canNegotiationTransition", () => {
    it("DRAFTからSENTに遷移できる", () => {
      expect(canNegotiationTransition("DRAFT", "SENT")).toBe(true);
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

    it("ACCEPTEDからCANCELLEDに遷移できる", () => {
      expect(canNegotiationTransition("ACCEPTED", "CANCELLED")).toBe(true);
    });

    it("DECLINEDからはどこにも遷移できない", () => {
      expect(canNegotiationTransition("DECLINED", "SENT")).toBe(false);
    });

    it("DRAFTからACCEPTEDには直接遷移できない", () => {
      expect(canNegotiationTransition("DRAFT", "ACCEPTED")).toBe(false);
    });
  });

  describe("assertNegotiationTransition", () => {
    it("許可された遷移では例外を投げない", () => {
      expect(() => assertNegotiationTransition("DRAFT", "SENT")).not.toThrow();
    });

    it("不正な遷移では例外を投げる", () => {
      expect(() => assertNegotiationTransition("DRAFT", "ACCEPTED")).toThrow();
    });
  });
});

describe("HelperRequest ステートマシン", () => {
  describe("canHelperRequestTransition", () => {
    it("PENDINGからACCEPTEDに遷移できる", () => {
      expect(canHelperRequestTransition("PENDING", "ACCEPTED")).toBe(true);
    });

    it("PENDINGからDECLINEDに遷移できる", () => {
      expect(canHelperRequestTransition("PENDING", "DECLINED")).toBe(true);
    });

    it("PENDINGからCANCELLEDに遷移できる", () => {
      expect(canHelperRequestTransition("PENDING", "CANCELLED")).toBe(true);
    });

    it("ACCEPTEDからCANCELLEDに遷移できる", () => {
      expect(canHelperRequestTransition("ACCEPTED", "CANCELLED")).toBe(true);
    });

    it("DECLINEDからはどこにも遷移できない", () => {
      expect(canHelperRequestTransition("DECLINED", "PENDING")).toBe(false);
    });

    it("CANCELLEDからはどこにも遷移できない", () => {
      expect(canHelperRequestTransition("CANCELLED", "PENDING")).toBe(false);
    });
  });

  describe("assertHelperRequestTransition", () => {
    it("許可された遷移では例外を投げない", () => {
      expect(() =>
        assertHelperRequestTransition("PENDING", "ACCEPTED"),
      ).not.toThrow();
    });

    it("不正な遷移では例外を投げる", () => {
      expect(() =>
        assertHelperRequestTransition("DECLINED", "PENDING"),
      ).toThrow();
    });
  });
});
