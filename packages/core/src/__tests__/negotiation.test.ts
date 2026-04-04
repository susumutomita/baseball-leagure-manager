import { describe, expect, it } from "bun:test";
import {
  type NegotiationSummary,
  cancelOtherNegotiations,
} from "../lib/negotiation-policy";
import {
  InvalidTransitionError,
  assertNegotiationTransition,
  canNegotiationTransition,
} from "../lib/state-machine";

// --- テストヘルパー ---

function createNegotiation(
  overrides: Partial<NegotiationSummary> & { id: string },
): NegotiationSummary {
  return {
    status: "SENT",
    ...overrides,
  };
}

// ============================================================
// cancelOtherNegotiations — 他の交渉の自動キャンセル
// ============================================================

describe("cancelOtherNegotiations", () => {
  describe("承諾された交渉以外にアクティブな交渉があるとき", () => {
    it("アクティブな交渉をキャンセル対象として返す", () => {
      const negotiations: NegotiationSummary[] = [
        createNegotiation({ id: "n1", status: "ACCEPTED" }),
        createNegotiation({ id: "n2", status: "SENT" }),
        createNegotiation({ id: "n3", status: "REPLIED" }),
      ];

      const result = cancelOtherNegotiations(negotiations, "n1");

      expect(result).toHaveLength(2);
      expect(result.map((n) => n.id)).toContain("n2");
      expect(result.map((n) => n.id)).toContain("n3");
    });
  });

  describe("他の交渉がすべて終端状態のとき", () => {
    it("空配列を返す", () => {
      const negotiations: NegotiationSummary[] = [
        createNegotiation({ id: "n1", status: "ACCEPTED" }),
        createNegotiation({ id: "n2", status: "DECLINED" }),
        createNegotiation({ id: "n3", status: "CANCELLED" }),
      ];

      const result = cancelOtherNegotiations(negotiations, "n1");

      expect(result).toHaveLength(0);
    });
  });

  describe("交渉が1つしかないとき", () => {
    it("空配列を返す", () => {
      const negotiations: NegotiationSummary[] = [
        createNegotiation({ id: "n1", status: "ACCEPTED" }),
      ];

      const result = cancelOtherNegotiations(negotiations, "n1");

      expect(result).toHaveLength(0);
    });
  });

  describe("DRAFT状態の交渉があるとき", () => {
    it("DRAFT状態の交渉もキャンセル対象に含める", () => {
      const negotiations: NegotiationSummary[] = [
        createNegotiation({ id: "n1", status: "ACCEPTED" }),
        createNegotiation({ id: "n2", status: "DRAFT" }),
      ];

      const result = cancelOtherNegotiations(negotiations, "n1");

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe("n2");
    });
  });

  describe("承諾された交渉自体はキャンセル対象に含めないとき", () => {
    it("承諾された交渉IDを除外する", () => {
      const negotiations: NegotiationSummary[] = [
        createNegotiation({ id: "n1", status: "ACCEPTED" }),
        createNegotiation({ id: "n2", status: "SENT" }),
      ];

      const result = cancelOtherNegotiations(negotiations, "n1");

      expect(result.find((n) => n.id === "n1")).toBeUndefined();
    });
  });
});

// ============================================================
// Negotiation 状態遷移 — 追加テスト
// ============================================================

describe("Negotiation 状態遷移", () => {
  describe("DRAFTからCANCELLEDに遷移するとき", () => {
    it("遷移を許可する", () => {
      expect(canNegotiationTransition("DRAFT", "CANCELLED")).toBe(true);
    });
  });

  describe("SENTからCANCELLEDに遷移するとき", () => {
    it("遷移を許可する", () => {
      expect(canNegotiationTransition("SENT", "CANCELLED")).toBe(true);
    });
  });

  describe("REPLIEDからCANCELLEDに遷移するとき", () => {
    it("遷移を許可する", () => {
      expect(canNegotiationTransition("REPLIED", "CANCELLED")).toBe(true);
    });
  });

  describe("REPLIEDからDECLINEDに遷移するとき", () => {
    it("遷移を許可する", () => {
      expect(canNegotiationTransition("REPLIED", "DECLINED")).toBe(true);
    });
  });

  describe("CANCELLEDから他の状態に遷移しようとするとき", () => {
    it("すべての遷移を拒否する", () => {
      expect(canNegotiationTransition("CANCELLED", "DRAFT")).toBe(false);
      expect(canNegotiationTransition("CANCELLED", "SENT")).toBe(false);
      expect(canNegotiationTransition("CANCELLED", "REPLIED")).toBe(false);
      expect(canNegotiationTransition("CANCELLED", "ACCEPTED")).toBe(false);
    });
  });

  describe("不正な遷移でassertNegotiationTransitionを呼ぶとき", () => {
    it("InvalidTransitionErrorを投げる", () => {
      expect(() => assertNegotiationTransition("CANCELLED", "SENT")).toThrow(
        InvalidTransitionError,
      );
    });

    it("エラーメッセージに遷移元と遷移先が含まれる", () => {
      try {
        assertNegotiationTransition("CANCELLED", "SENT");
      } catch (e) {
        expect((e as Error).message).toContain("CANCELLED");
        expect((e as Error).message).toContain("SENT");
      }
    });
  });
});
