/**
 * 精算計算ロジック
 *
 * 経費一覧から精算金額を計算する純粋関数群。
 * API ルートや UI から利用される。
 */

import type { Expense } from "../types/domain";

/** 精算計算の入力 */
export interface SettlementCalculationInput {
  /** 経費一覧 */
  expenses: Pick<Expense, "amount" | "split_with_opponent">[];
  /** 参加人数 */
  memberCount: number;
}

/** 精算計算の結果 */
export interface SettlementCalculationResult {
  /** 合計費用 */
  totalCost: number;
  /** 対戦相手負担額 */
  opponentShare: number;
  /** チーム負担額 */
  teamCost: number;
  /** 一人あたり金額（切り上げ） */
  perMember: number;
  /** 参加人数 */
  memberCount: number;
}

/**
 * 経費一覧から精算金額を計算する
 *
 * - totalCost: 全経費の合計
 * - opponentShare: split_with_opponent が true の経費を半額にした合計
 * - teamCost: totalCost - opponentShare
 * - perMember: teamCost / memberCount（切り上げ）
 *
 * @throws {Error} expenses が空、または memberCount が 0 以下の場合
 */
export function calculateSettlement(
  input: SettlementCalculationInput,
): SettlementCalculationResult {
  const { expenses, memberCount } = input;

  if (expenses.length === 0) {
    throw new Error("経費が登録されていません");
  }

  if (memberCount <= 0) {
    throw new Error("参加人数は1以上である必要があります");
  }

  const totalCost = expenses.reduce((sum, e) => sum + e.amount, 0);

  const opponentShare = expenses
    .filter((e) => e.split_with_opponent)
    .reduce((sum, e) => sum + Math.floor(e.amount / 2), 0);

  const teamCost = totalCost - opponentShare;
  const perMember = Math.ceil(teamCost / memberCount);

  return {
    totalCost,
    opponentShare,
    teamCost,
    perMember,
    memberCount,
  };
}
