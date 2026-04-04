// ============================================================
// 対戦相手マッチングユーティリティ
// 過去の対戦履歴・エリア・最終対戦日から推薦スコアを算出する
// ============================================================
import type { OpponentTeam } from "../types/domain";

/** 対戦相手推薦結果 */
export interface OpponentRecommendation {
  opponentTeam: OpponentTeam;
  score: number;
  reasons: string[];
}

/** マッチング条件 */
export interface MatchingCriteria {
  homeArea?: string;
  preferRecentOpponents?: boolean;
  maxTimesPlayed?: number;
}

/**
 * 対戦相手の推薦スコアを計算する
 *
 * スコア要素:
 * - エ��ア一致: +30
 * - 過去の対���回数 (適度な頻度を評価): +0〜20
 * - 最終対戦日からの日数 (久しぶりだとボーナス): +0〜30
 * - 連絡先の充実度: +0〜20
 */
export function scoreOpponent(
  opponent: OpponentTeam,
  criteria: MatchingCriteria,
  now: Date = new Date(),
): OpponentRecommendation {
  let score = 0;
  const reasons: string[] = [];

  // エリア一致ボーナス
  if (criteria.homeArea && opponent.area) {
    if (
      opponent.area.includes(criteria.homeArea) ||
      criteria.homeArea.includes(opponent.area)
    ) {
      score += 30;
      reasons.push("活動エリアが近い");
    }
  }

  // 対戦回数スコア (3〜5回が最適)
  if (opponent.times_played >= 1 && opponent.times_played <= 2) {
    score += 15;
    reasons.push("対戦経験あり (まだ少なめ)");
  } else if (opponent.times_played >= 3 && opponent.times_played <= 5) {
    score += 20;
    reasons.push("適度な対戦経験あり");
  } else if (opponent.times_played > 5) {
    score += 10;
    reasons.push("対戦回数が多い (マンネリ注意)");
  } else {
    score += 5;
    reasons.push("未対戦のチーム");
  }

  // 最終対戦日ボーナス (3ヶ月以上空いていると高評価)
  if (opponent.last_played_at) {
    const lastPlayed = new Date(opponent.last_played_at);
    const daysSinceLast = Math.floor(
      (now.getTime() - lastPlayed.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (daysSinceLast > 180) {
      score += 30;
      reasons.push("半年以上対���なし");
    } else if (daysSinceLast > 90) {
      score += 20;
      reasons.push("3ヶ月以上対戦なし");
    } else if (daysSinceLast > 30) {
      score += 10;
      reasons.push("1ヶ月以上対戦なし");
    }
  }

  // 連絡先充実度
  let contactScore = 0;
  if (opponent.contact_email) contactScore += 5;
  if (opponent.contact_line) contactScore += 10;
  if (opponent.contact_phone) contactScore += 5;
  score += contactScore;
  if (contactScore >= 15) {
    reasons.push("連絡先が充実");
  }

  return { opponentTeam: opponent, score, reasons };
}

/**
 * 対戦相手をスコア���に推薦する
 */
export function recommendOpponents(
  opponents: OpponentTeam[],
  criteria: MatchingCriteria,
  limit = 5,
  now: Date = new Date(),
): OpponentRecommendation[] {
  return opponents
    .map((o) => scoreOpponent(o, criteria, now))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
