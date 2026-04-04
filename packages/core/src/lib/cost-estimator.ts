// ============================================================
// コスト見積もりユーティリティ — 過去の経費データから試合コストを予測
// ============================================================
import type { Expense, GameType } from "../types/domain";

/** コスト見積もり結果 */
export interface CostEstimate {
  estimatedTotal: number;
  estimatedPerMember: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  breakdown: CategoryEstimate[];
  basedOnGames: number;
}

/** カテゴリ別見積もり */
export interface CategoryEstimate {
  category: Expense["category"];
  estimatedAmount: number;
  historicalAverage: number;
  dataPoints: number;
}

/**
 * 過去の経費データから試合コストを見積もる
 */
export function estimateGameCost(
  historicalExpenses: Array<{
    game_type: GameType;
    expenses: Pick<Expense, "category" | "amount">[];
  }>,
  targetGameType: GameType,
  expectedMembers: number,
): CostEstimate {
  // 同じ種別の試合のみフィルタ
  const relevantGames = historicalExpenses.filter(
    (g) => g.game_type === targetGameType,
  );

  // データが足りない場合は全データを使用
  const games = relevantGames.length >= 3 ? relevantGames : historicalExpenses;
  const basedOnGames = games.length;

  if (basedOnGames === 0) {
    return {
      estimatedTotal: 0,
      estimatedPerMember: 0,
      confidence: "LOW",
      breakdown: [],
      basedOnGames: 0,
    };
  }

  // カテゴリ別の平均を計算
  const categoryTotals = new Map<
    Expense["category"],
    { total: number; count: number }
  >();

  for (const game of games) {
    for (const expense of game.expenses) {
      const existing = categoryTotals.get(expense.category) ?? {
        total: 0,
        count: 0,
      };
      existing.total += expense.amount;
      existing.count += 1;
      categoryTotals.set(expense.category, existing);
    }
  }

  const breakdown: CategoryEstimate[] = Array.from(
    categoryTotals.entries(),
  ).map(([category, { total, count }]) => ({
    category,
    estimatedAmount: Math.round(total / basedOnGames),
    historicalAverage: Math.round(total / count),
    dataPoints: count,
  }));

  const estimatedTotal = breakdown.reduce(
    (sum, b) => sum + b.estimatedAmount,
    0,
  );
  const estimatedPerMember =
    expectedMembers > 0 ? Math.ceil(estimatedTotal / expectedMembers) : 0;

  // 信頼度判定
  let confidence: "HIGH" | "MEDIUM" | "LOW";
  if (relevantGames.length >= 5) {
    confidence = "HIGH";
  } else if (relevantGames.length >= 3) {
    confidence = "MEDIUM";
  } else {
    confidence = "LOW";
  }

  return {
    estimatedTotal,
    estimatedPerMember,
    confidence,
    breakdown,
    basedOnGames,
  };
}
