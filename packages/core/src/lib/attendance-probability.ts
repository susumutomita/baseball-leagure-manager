// ============================================================
// 出席確率予測 — Issue #117
// メンバーの過去参加率から最低人数到達確率を算出
// ============================================================
import type { Member } from "../types/domain";

export type AttendancePrediction = {
  expected_count: number;
  probability_of_min: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  member_predictions: { member_id: string; probability: number }[];
};

/**
 * メンバーの参加率から最低人数到達確率を予測
 * Poisson binomial distribution の DP 近似
 */
export function predictAttendanceProbability(
  members: Pick<Member, "id" | "attendance_rate">[],
  minPlayers: number,
): AttendancePrediction {
  const predictions = members.map((m) => ({
    member_id: m.id,
    probability: m.attendance_rate ?? 0.5,
  }));

  const expectedCount = predictions.reduce((sum, p) => sum + p.probability, 0);

  const n = predictions.length;
  const probs = predictions.map((p) => p.probability);

  // dp[k] = P(ちょうどk人参加)
  let dp = new Array(n + 1).fill(0);
  dp[0] = 1;

  for (let i = 0; i < n; i++) {
    const newDp = new Array(n + 1).fill(0);
    for (let k = 0; k <= i; k++) {
      newDp[k] += dp[k] * (1 - probs[i]);
      newDp[k + 1] += dp[k] * probs[i];
    }
    dp = newDp;
  }

  // P(X >= minPlayers)
  let probabilityOfMin = 0;
  for (let k = minPlayers; k <= n; k++) {
    probabilityOfMin += dp[k];
  }

  const confidence =
    members.length >= 15 ? "HIGH" : members.length >= 9 ? "MEDIUM" : "LOW";

  return {
    expected_count: Math.round(expectedCount * 10) / 10,
    probability_of_min: Math.round(probabilityOfMin * 1000) / 1000,
    confidence,
    member_predictions: predictions,
  };
}

/**
 * 一人あたりの参加費を見積もる
 */
export function estimatePerPersonCost(
  totalExpenses: number,
  headcount: number,
  opponentShare = 0,
): { per_person: number; team_cost: number } {
  const teamCost = totalExpenses - opponentShare;
  const perPerson = headcount > 0 ? Math.ceil(teamCost / headcount) : 0;
  return { per_person: perPerson, team_cost: teamCost };
}
