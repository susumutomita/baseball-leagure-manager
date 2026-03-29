// ============================================================
// ルールエンジン (Governor)
// 状態遷移の決定・暴走防止・確定前チェックを担う
// ============================================================
import type {
  MatchRequest,
  Negotiation,
  AvailabilityResponse,
} from "@/types/domain";

export interface GovernorContext {
  matchRequest: MatchRequest;
  negotiations: Negotiation[];
  availabilities: AvailabilityResponse[];
  memberCount: number;
  minPlayers: number;
  hasGround: boolean;
}

export interface GovernorResult {
  allowed: boolean;
  reasons: string[];
  reviewRequired: boolean;
}

/** 確定 (READY_TO_CONFIRM → CONFIRMED) 可否を判定 */
export function canConfirm(ctx: GovernorContext): GovernorResult {
  const reasons: string[] = [];
  let reviewRequired = false;

  // 最低人数チェック
  const availableCount = ctx.availabilities.filter(
    (a) => a.response === "AVAILABLE",
  ).length;
  if (availableCount < ctx.minPlayers) {
    reasons.push(
      `参加可能人数が不足しています (${availableCount}/${ctx.minPlayers})`,
    );
  }

  // 相手チーム承諾チェック
  const accepted = ctx.negotiations.filter((n) => n.status === "ACCEPTED");
  if (accepted.length === 0) {
    reasons.push("承諾済みの対戦相手がいません");
  }

  // グラウンド確保チェック
  if (ctx.matchRequest.needs_ground && !ctx.hasGround) {
    reasons.push("グラウンドが未確保です");
  }

  // 人数がギリギリの場合はレビュー必須
  if (
    availableCount >= ctx.minPlayers &&
    availableCount <= ctx.minPlayers + 1
  ) {
    reviewRequired = true;
  }

  return {
    allowed: reasons.length === 0,
    reasons,
    reviewRequired,
  };
}

/** OPEN に戻す際の停止条件チェック */
export function checkStopConditions(ctx: GovernorContext): string[] {
  const warnings: string[] = [];

  // 候補日不足
  const mr = ctx.matchRequest;
  if (
    !mr.desired_dates_json ||
    mr.desired_dates_json.length === 0
  ) {
    warnings.push("希望日が設定されていません");
  }

  // 全交渉が失敗
  if (
    ctx.negotiations.length > 0 &&
    ctx.negotiations.every(
      (n) => n.status === "DECLINED",
    )
  ) {
    warnings.push("すべての交渉が不成立です");
  }

  return warnings;
}

/** 信頼度スコアを算出 (0-100) */
export function calculateConfidence(ctx: GovernorContext): number {
  let score = 0;

  // 対戦相手が承諾済み (+40)
  if (ctx.negotiations.some((n) => n.status === "ACCEPTED")) {
    score += 40;
  } else if (ctx.negotiations.some((n) => n.status === "REPLIED")) {
    score += 20;
  } else if (ctx.negotiations.some((n) => n.status === "SENT")) {
    score += 5;
  }

  // グラウンド確保済み (+30)
  if (!ctx.matchRequest.needs_ground || ctx.hasGround) {
    score += 30;
  }

  // 出欠 (+30)
  const availableCount = ctx.availabilities.filter(
    (a) => a.response === "AVAILABLE",
  ).length;
  const ratio =
    ctx.minPlayers > 0 ? availableCount / ctx.minPlayers : 0;
  score += Math.min(30, Math.round(ratio * 30));

  return Math.min(100, score);
}
