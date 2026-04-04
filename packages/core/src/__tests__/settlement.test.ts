import { describe, expect, it } from "bun:test";
import { generatePayPayLink } from "../lib/paypay";
import { calculateSettlement } from "../lib/settlement";
import type { SettlementCalculationInput } from "../lib/settlement";

// --- テストヘルパー ---

function createExpense(
  overrides: Partial<{ amount: number; split_with_opponent: boolean }> = {},
) {
  return {
    amount: overrides.amount ?? 1000,
    split_with_opponent: overrides.split_with_opponent ?? false,
  };
}

function createInput(
  overrides: Partial<SettlementCalculationInput> = {},
): SettlementCalculationInput {
  return {
    expenses: overrides.expenses ?? [createExpense()],
    memberCount: overrides.memberCount ?? 10,
  };
}

// --- テスト ---

describe("calculateSettlement", () => {
  describe("経費が1件で折半なしのとき", () => {
    it("合計費用がそのまま計算される", () => {
      const result = calculateSettlement(
        createInput({
          expenses: [createExpense({ amount: 5000 })],
          memberCount: 10,
        }),
      );

      expect(result.totalCost).toBe(5000);
      expect(result.opponentShare).toBe(0);
      expect(result.teamCost).toBe(5000);
      expect(result.perMember).toBe(500);
      expect(result.memberCount).toBe(10);
    });
  });

  describe("複数の経費があるとき", () => {
    it("合計費用が全経費の合算になる", () => {
      const result = calculateSettlement(
        createInput({
          expenses: [
            createExpense({ amount: 3000 }),
            createExpense({ amount: 2000 }),
            createExpense({ amount: 500 }),
          ],
          memberCount: 10,
        }),
      );

      expect(result.totalCost).toBe(5500);
      expect(result.teamCost).toBe(5500);
      expect(result.perMember).toBe(550);
    });
  });

  describe("対戦相手と折半する経費があるとき", () => {
    it("折半分が対戦相手負担として差し引かれる", () => {
      const result = calculateSettlement(
        createInput({
          expenses: [
            createExpense({ amount: 6000, split_with_opponent: true }),
            createExpense({ amount: 1000, split_with_opponent: false }),
          ],
          memberCount: 5,
        }),
      );

      expect(result.totalCost).toBe(7000);
      expect(result.opponentShare).toBe(3000); // 6000 / 2
      expect(result.teamCost).toBe(4000); // 7000 - 3000
      expect(result.perMember).toBe(800); // 4000 / 5
    });
  });

  describe("折半で端数が出るとき", () => {
    it("対戦相手負担は切り捨て、一人あたりは切り上げになる", () => {
      const result = calculateSettlement(
        createInput({
          expenses: [
            createExpense({ amount: 5001, split_with_opponent: true }),
          ],
          memberCount: 3,
        }),
      );

      // 5001 / 2 = 2500.5 → floor → 2500
      expect(result.opponentShare).toBe(2500);
      // 5001 - 2500 = 2501
      expect(result.teamCost).toBe(2501);
      // 2501 / 3 = 833.67 → ceil → 834
      expect(result.perMember).toBe(834);
    });
  });

  describe("全経費が折半のとき", () => {
    it("全額の半分が対戦相手負担になる", () => {
      const result = calculateSettlement(
        createInput({
          expenses: [
            createExpense({ amount: 4000, split_with_opponent: true }),
            createExpense({ amount: 2000, split_with_opponent: true }),
          ],
          memberCount: 4,
        }),
      );

      expect(result.totalCost).toBe(6000);
      expect(result.opponentShare).toBe(3000); // 2000 + 1000
      expect(result.teamCost).toBe(3000);
      expect(result.perMember).toBe(750);
    });
  });

  describe("参加人数が1人のとき", () => {
    it("チーム負担全額が一人あたりになる", () => {
      const result = calculateSettlement(
        createInput({
          expenses: [createExpense({ amount: 3000 })],
          memberCount: 1,
        }),
      );

      expect(result.perMember).toBe(3000);
    });
  });

  describe("経費が空のとき", () => {
    it("エラーをスローする", () => {
      expect(() => calculateSettlement(createInput({ expenses: [] }))).toThrow(
        "経費が登録されていません",
      );
    });
  });

  describe("参加人数が0のとき", () => {
    it("エラーをスローする", () => {
      expect(() =>
        calculateSettlement(createInput({ memberCount: 0 })),
      ).toThrow("参加人数は1以上である必要があります");
    });
  });

  describe("参加人数が負の数のとき", () => {
    it("エラーをスローする", () => {
      expect(() =>
        calculateSettlement(createInput({ memberCount: -1 })),
      ).toThrow("参加人数は1以上である必要があります");
    });
  });
});

describe("generatePayPayLink — 精算連携", () => {
  describe("精算結果の一人あたり金額を渡したとき", () => {
    it("金額がURLに含まれる", () => {
      const result = calculateSettlement(
        createInput({
          expenses: [
            createExpense({ amount: 6000, split_with_opponent: true }),
            createExpense({ amount: 1000 }),
          ],
          memberCount: 5,
        }),
      );

      const link = generatePayPayLink(result.perMember, "4/3 練習試合 精算");
      const url = new URL(link);

      expect(url.searchParams.get("amount")).toBe(String(result.perMember));
    });

    it("説明文がURLに含まれる", () => {
      const link = generatePayPayLink(800, "春季リーグ第1節 精算");
      const url = new URL(link);

      expect(url.searchParams.get("description")).toBe("春季リーグ第1節 精算");
    });
  });
});
