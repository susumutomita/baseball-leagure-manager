// ============================================================
// next_actions 推薦ロジック
// ゲームの状態・コンテキストに基づき、エージェントに次のアクションを提案する
// ============================================================
import type { Game, HelperRequest, Negotiation, Rsvp } from "../types/domain";
import type { NextAction } from "./response";
import { getAvailableTransitions } from "./state-machine";

export interface GameContext {
  game: Game;
  rsvps?: Rsvp[];
  helperRequests?: HelperRequest[];
  negotiations?: Negotiation[];
  totalMembers?: number;
}

/** ゲームの状態とコンテキストから next_actions を生成 */
export function suggestNextActions(ctx: GameContext): NextAction[] {
  const actions: NextAction[] = [];
  const { game } = ctx;

  switch (game.status) {
    case "DRAFT":
      actions.push(...suggestDraftActions(ctx));
      break;
    case "COLLECTING":
      actions.push(...suggestCollectingActions(ctx));
      break;
    case "CONFIRMED":
      actions.push(...suggestConfirmedActions(ctx));
      break;
    case "COMPLETED":
      actions.push(...suggestCompletedActions(ctx));
      break;
  }

  // 常に利用可能な遷移を提示
  const transitions = getAvailableTransitions(game.status);
  if (transitions.includes("CANCELLED") && actions.length > 0) {
    actions.push({
      action: "transition_game",
      reason: "試合をキャンセルする場合",
      priority: "low",
      suggested_params: { new_status: "CANCELLED" },
    });
  }

  return actions;
}

function suggestDraftActions(ctx: GameContext): NextAction[] {
  const actions: NextAction[] = [];
  const { game } = ctx;

  if (!game.game_date) {
    actions.push({
      action: "update_game",
      reason: "試合日が未設定です",
      priority: "high",
      suggested_params: { game_date: null },
    });
  }

  if (!game.ground_id && !game.ground_name) {
    actions.push({
      action: "update_game",
      reason: "グラウンドが未設定です",
      priority: "medium",
      suggested_params: { ground_name: null },
    });
  }

  actions.push({
    action: "transition_game",
    reason: "出欠収集を開始してください",
    priority: "high",
    suggested_params: { new_status: "COLLECTING" },
  });

  return actions;
}

function suggestCollectingActions(ctx: GameContext): NextAction[] {
  const actions: NextAction[] = [];
  const { game, rsvps = [], totalMembers = 0 } = ctx;

  const noResponse = rsvps.filter((r) => r.response === "NO_RESPONSE").length;
  const responded = rsvps.filter((r) => r.response !== "NO_RESPONSE").length;

  if (rsvps.length === 0) {
    actions.push({
      action: "request_rsvps",
      reason: "出欠依頼がまだ送信されていません",
      priority: "high",
      suggested_params: { game_id: game.id },
    });
  } else if (noResponse > 0) {
    actions.push({
      action: "get_rsvps",
      reason: `${noResponse}人の未回答メンバーがいます (${responded}/${totalMembers})`,
      priority: "high",
      suggested_params: { game_id: game.id },
    });
  }

  const deadlinePassed = game.rsvp_deadline
    ? new Date(game.rsvp_deadline) <= new Date()
    : false;
  const allResponded = totalMembers > 0 && rsvps.length > 0 && noResponse === 0;

  if (deadlinePassed || allResponded) {
    actions.push({
      action: "transition_game",
      reason: deadlinePassed
        ? "出欠締切が到来しました。試合を確定できます"
        : "全員が回答済みです。試合を確定できます",
      priority: "high",
      suggested_params: { new_status: "CONFIRMED" },
    });
  }

  return actions;
}

function suggestConfirmedActions(ctx: GameContext): NextAction[] {
  const { game } = ctx;
  const gameDate = game.game_date ? new Date(game.game_date) : null;
  const isPast = gameDate && gameDate < new Date();

  if (isPast) {
    return [
      {
        action: "transition_game",
        reason: "試合日が過ぎています。COMPLETEDに進めてください",
        priority: "high",
        suggested_params: { new_status: "COMPLETED" },
      },
    ];
  }

  return [
    {
      action: "validate_game",
      reason: "試合の成立条件を再確認できます",
      priority: "low",
      suggested_params: { game_id: game.id },
    },
  ];
}

function suggestCompletedActions(ctx: GameContext): NextAction[] {
  return [
    {
      action: "add_expense",
      reason: "支出を登録して精算を行ってください",
      priority: "medium",
      suggested_params: { game_id: ctx.game.id },
    },
    {
      action: "calculate_settlement",
      reason: "精算を計算します",
      priority: "medium",
      suggested_params: { game_id: ctx.game.id },
    },
  ];
}

/** 試合作成直後の next_actions */
export function suggestAfterCreate(game: Game): NextAction[] {
  return suggestNextActions({ game });
}

/** 状態遷移エラー時の next_actions */
export function suggestOnTransitionError(
  _currentStatus: string,
  availableTransitions: string[],
): NextAction[] {
  return availableTransitions
    .filter((t) => t !== "CANCELLED")
    .map((t) => ({
      action: "transition_game",
      reason: `${t} に遷移できます`,
      priority: "medium" as const,
      suggested_params: { new_status: t },
    }));
}
