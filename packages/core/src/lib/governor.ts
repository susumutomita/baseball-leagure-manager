// ============================================================
// ルールエンジン (Governor) v2
// Game ライフサイクルの各遷移判定を担う
// ============================================================
import type { Game, HelperRequest, Negotiation, Rsvp } from "../types/domain";

// ============================================================
// 共通型
// ============================================================

export interface GovernorSuggestion {
  action: string;
  description: string;
}

export interface GovernorResult {
  allowed: boolean;
  reasons: string[];
  suggestions: GovernorSuggestion[];
  reviewRequired: boolean;
}

// ============================================================
// COLLECTING → CONFIRMED 判定
// マネージャーが「やる」と判断した際の確認チェック
// ============================================================

export interface ConfirmContext {
  game: Game;
  rsvps: Rsvp[];
  helperRequests: HelperRequest[];
  negotiations: Negotiation[];
  hasGround: boolean;
}

export function canConfirm(ctx: ConfirmContext): GovernorResult {
  const reasons: string[] = [];
  const suggestions: GovernorSuggestion[] = [];
  let reviewRequired = false;

  // 人数チェック
  const availableMembers = ctx.rsvps.filter(
    (r) => r.response === "AVAILABLE",
  ).length;
  const acceptedHelpers = ctx.helperRequests.filter(
    (h) => h.status === "ACCEPTED",
  ).length;
  const maybeMembers = ctx.rsvps.filter((r) => r.response === "MAYBE").length;
  const noResponseMembers = ctx.rsvps.filter(
    (r) => r.response === "NO_RESPONSE",
  ).length;
  const totalAvailable = availableMembers + acceptedHelpers;
  const shortage = ctx.game.min_players - totalAvailable;

  if (totalAvailable < ctx.game.min_players) {
    reasons.push(
      `参加可能人数が不足しています (${totalAvailable}/${ctx.game.min_players})`,
    );
    if (noResponseMembers > 0) {
      suggestions.push({
        action: "send_reminder",
        description: `${noResponseMembers}人の未回答メンバーにリマインダーを送信してください`,
      });
    }
    if (maybeMembers > 0) {
      suggestions.push({
        action: "confirm_maybe",
        description: `${maybeMembers}人の「未定」メンバーに参加確認してください`,
      });
    }
    if (shortage > 0) {
      suggestions.push({
        action: "request_helpers",
        description: `あと${shortage}人必要です。助っ人を依頼してください`,
      });
    }
  }

  // 対戦相手チェック（練習以外）
  if (ctx.game.game_type !== "PRACTICE") {
    const accepted = ctx.negotiations.filter((n) => n.status === "ACCEPTED");
    if (accepted.length === 0) {
      reasons.push("承諾済みの対戦相手がいません");
      const pending = ctx.negotiations.filter(
        (n) => n.status === "SENT" || n.status === "REPLIED",
      );
      if (pending.length > 0) {
        suggestions.push({
          action: "follow_up_negotiation",
          description: `${pending.length}件の交渉が進行中です。返答を確認してください`,
        });
      } else {
        suggestions.push({
          action: "create_negotiation",
          description: "対戦相手に交渉を開始してください",
        });
      }
    }
  }

  // グラウンドチェック
  if (!ctx.hasGround && !ctx.game.ground_id && !ctx.game.ground_name) {
    reasons.push("グラウンドが未確保です");
    suggestions.push({
      action: "search_ground",
      description: "グラウンドを検索して確保してください",
    });
  }

  // ギリギリの場合はレビュー必須
  if (
    totalAvailable >= ctx.game.min_players &&
    totalAvailable <= ctx.game.min_players + 1
  ) {
    reviewRequired = true;
  }

  return {
    allowed: reasons.length === 0,
    reasons,
    suggestions,
    reviewRequired,
  };
}

// ============================================================
// 助っ人充足判定
// 必要人数を満たしたらPENDINGの打診を自動キャンセル
// ============================================================

export interface FulfillmentContext {
  game: Game;
  availableMembers: number;
  helperRequests: HelperRequest[];
}

export interface FulfillmentResult {
  fulfilled: boolean;
  totalAvailable: number;
  needed: number;
  toCancel: string[];
}

export function checkHelperFulfillment(
  ctx: FulfillmentContext,
): FulfillmentResult {
  const acceptedHelpers = ctx.helperRequests.filter(
    (h) => h.status === "ACCEPTED",
  ).length;
  const totalAvailable = ctx.availableMembers + acceptedHelpers;
  const fulfilled = totalAvailable >= ctx.game.min_players;

  // 充足したら PENDING の打診をキャンセル対象にする
  const toCancel = fulfilled
    ? ctx.helperRequests.filter((h) => h.status === "PENDING").map((h) => h.id)
    : [];

  return {
    fulfilled,
    totalAvailable,
    needed: ctx.game.min_players,
    toCancel,
  };
}

// ============================================================
// 停止条件チェック
// ============================================================

export interface StopConditionContext {
  game: Game;
  negotiations: Negotiation[];
}

export function checkStopConditions(ctx: StopConditionContext): string[] {
  const warnings: string[] = [];

  if (!ctx.game.game_date) {
    warnings.push("試合日が設定されていません");
  }

  if (
    ctx.negotiations.length > 0 &&
    ctx.negotiations.every(
      (n) => n.status === "DECLINED" || n.status === "CANCELLED",
    )
  ) {
    warnings.push("すべての交渉が不成立です");
  }

  return warnings;
}
