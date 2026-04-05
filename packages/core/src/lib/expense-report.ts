// ============================================================
// 経費レポートユーティリティ — カテゴリ別集計・レポート生成
// ============================================================
import type { Expense } from "../types/domain";

/** カテゴリ別の経費サマリー */
export interface CategorySummary {
  category: Expense["category"];
  totalAmount: number;
  count: number;
  percentage: number;
}

/** 経費レポート */
export interface ExpenseReport {
  totalAmount: number;
  totalCount: number;
  categories: CategorySummary[];
  opponentShareTotal: number;
  teamShareTotal: number;
  averagePerGame: number;
}

const CATEGORY_LABELS: Record<Expense["category"], string> = {
  GROUND: "グラウンド",
  UMPIRE: "審判",
  BALL: "ボール",
  DRINK: "飲料",
  TOURNAMENT_FEE: "大会参加費",
  OTHER: "その他",
};

/** カテゴリの日本語ラベルを取得する */
export function getCategoryLabel(category: Expense["category"]): string {
  return CATEGORY_LABELS[category];
}

/**
 * 経費をカテゴリ別に集計する
 */
export function summarizeByCategory(expenses: Expense[]): CategorySummary[] {
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  const categoryMap = new Map<
    Expense["category"],
    { amount: number; count: number }
  >();

  for (const expense of expenses) {
    const existing = categoryMap.get(expense.category) ?? {
      amount: 0,
      count: 0,
    };
    existing.amount += expense.amount;
    existing.count += 1;
    categoryMap.set(expense.category, existing);
  }

  return Array.from(categoryMap.entries())
    .map(([category, { amount, count }]) => ({
      category,
      totalAmount: amount,
      count,
      percentage:
        totalAmount > 0 ? Math.round((amount / totalAmount) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.totalAmount - a.totalAmount);
}

/**
 * 複数試合の経費からレポートを生成する
 */
export function generateExpenseReport(
  expenses: Expense[],
  gameCount: number,
): ExpenseReport {
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  const totalCount = expenses.length;
  const categories = summarizeByCategory(expenses);

  const opponentShareTotal = expenses
    .filter((e) => e.split_with_opponent)
    .reduce((sum, e) => sum + Math.floor(e.amount / 2), 0);

  const teamShareTotal = totalAmount - opponentShareTotal;
  const averagePerGame =
    gameCount > 0 ? Math.round(totalAmount / gameCount) : 0;

  return {
    totalAmount,
    totalCount,
    categories,
    opponentShareTotal,
    teamShareTotal,
    averagePerGame,
  };
}
