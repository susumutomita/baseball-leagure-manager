import { describe, expect, it } from "bun:test";
import {
  generateExpenseReport,
  getCategoryLabel,
  summarizeByCategory,
} from "../lib/expense-report";
import type { Expense } from "../types/domain";

function createExpense(overrides: Partial<Expense> = {}): Expense {
  return {
    id: "exp-1",
    game_id: "game-1",
    category: "GROUND",
    amount: 5000,
    paid_by: null,
    split_with_opponent: false,
    note: null,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("getCategoryLabel", () => {
  it("カテゴリの日本語ラベルを返す", () => {
    expect(getCategoryLabel("GROUND")).toBe("グラウンド");
    expect(getCategoryLabel("UMPIRE")).toBe("審判");
    expect(getCategoryLabel("BALL")).toBe("ボール");
    expect(getCategoryLabel("DRINK")).toBe("飲料");
    expect(getCategoryLabel("TOURNAMENT_FEE")).toBe("大会参加費");
    expect(getCategoryLabel("OTHER")).toBe("その他");
  });
});

describe("summarizeByCategory", () => {
  it("カテゴリ別に集計する", () => {
    const expenses = [
      createExpense({ id: "e-1", category: "GROUND", amount: 5000 }),
      createExpense({ id: "e-2", category: "GROUND", amount: 3000 }),
      createExpense({ id: "e-3", category: "UMPIRE", amount: 2000 }),
    ];
    const result = summarizeByCategory(expenses);
    expect(result).toHaveLength(2);
    expect(result[0]?.category).toBe("GROUND");
    expect(result[0]?.totalAmount).toBe(8000);
    expect(result[0]?.count).toBe(2);
    expect(result[1]?.category).toBe("UMPIRE");
    expect(result[1]?.totalAmount).toBe(2000);
  });

  it("パーセンテージを計算する", () => {
    const expenses = [
      createExpense({ id: "e-1", category: "GROUND", amount: 8000 }),
      createExpense({ id: "e-2", category: "UMPIRE", amount: 2000 }),
    ];
    const result = summarizeByCategory(expenses);
    expect(result[0]?.percentage).toBe(80);
    expect(result[1]?.percentage).toBe(20);
  });

  it("金額の大きい順にソートする", () => {
    const expenses = [
      createExpense({ id: "e-1", category: "BALL", amount: 1000 }),
      createExpense({ id: "e-2", category: "GROUND", amount: 5000 }),
    ];
    const result = summarizeByCategory(expenses);
    expect(result[0]?.category).toBe("GROUND");
  });

  it("空配列のとき空配列を返す", () => {
    expect(summarizeByCategory([])).toHaveLength(0);
  });
});

describe("generateExpenseReport", () => {
  it("レポートを正しく生成する", () => {
    const expenses = [
      createExpense({
        id: "e-1",
        category: "GROUND",
        amount: 6000,
        split_with_opponent: true,
      }),
      createExpense({ id: "e-2", category: "UMPIRE", amount: 2000 }),
      createExpense({ id: "e-3", category: "BALL", amount: 1000 }),
    ];
    const report = generateExpenseReport(expenses, 3);

    expect(report.totalAmount).toBe(9000);
    expect(report.totalCount).toBe(3);
    expect(report.opponentShareTotal).toBe(3000); // 6000/2
    expect(report.teamShareTotal).toBe(6000); // 9000 - 3000
    expect(report.averagePerGame).toBe(3000); // 9000 / 3
    expect(report.categories).toHaveLength(3);
  });

  it("試合数0のとき平均を0にする", () => {
    const expenses = [createExpense()];
    const report = generateExpenseReport(expenses, 0);
    expect(report.averagePerGame).toBe(0);
  });
});
