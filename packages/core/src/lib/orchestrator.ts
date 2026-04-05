// ============================================================
// ゲームオーケストレーター — コアフロー自動化サービス
//
// ゲームのライフサイクルを監視し、次に必要なアクションを判定する。
// 実行はせず「提案」のみを生成する (AI is Planner, not Executor)。
//
// 依存関係グラフ:
//   独立: グラウンド確保, 出欠収集
//   依存: 助っ人募集 ← 出欠結果
//         対戦相手打診 ← グラウンド確保 + 人数見込み
//         試合確定 ← グラウンド + 人数 + 対戦相手
// ============================================================

import type {
  Game,
  GameStatus,
  HelperRequest,
  Member,
  Negotiation,
  Rsvp,
  Team,
} from "../types/domain";

// ============================================================
// 型定義
// ============================================================

/** オーケストレーターが生成するアクション */
export interface OrchestratorAction {
  /** アクション種別 */
  type: OrchestratorActionType;
  /** 優先度 */
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW";
  /** 人間向け説明 */
  description: string;
  /** 対象ゲームID */
  gameId: string;
  /** アクション固有のパラメータ */
  params: Record<string, unknown>;
}

export type OrchestratorActionType =
  | "SEND_ATTENDANCE_REQUEST"
  | "SEND_REMINDER"
  | "NOTIFY_PLAYER_THRESHOLD_REACHED"
  | "SUGGEST_HELPER_RECRUITMENT"
  | "SUGGEST_OPPONENT_CONTACT"
  | "NOTIFY_READY_TO_CONFIRM"
  | "WARN_DEADLINE_APPROACHING"
  | "AUTO_TRANSITION_TO_COLLECTING"
  | "WARN_ALL_NEGOTIATIONS_FAILED"
  | "NOTIFY_GAME_READY";

/** オーケストレーターへの入力: 1つのゲームの完全なコンテキスト */
export interface GameOrchestrationContext {
  game: Game;
  team: Team;
  rsvps: Rsvp[];
  members: Member[];
  helperRequests: HelperRequest[];
  negotiations: Negotiation[];
  /** このゲームに対して過去に送信済みの通知タイプ一覧 */
  sentNotificationTypes: string[];
}

/** オーケストレーション結果 */
export interface OrchestrationResult {
  gameId: string;
  gameTitle: string;
  status: GameStatus;
  actions: OrchestratorAction[];
}

/** 全チームのオーケストレーション結果 */
export interface TeamOrchestrationResult {
  teamId: string;
  teamName: string;
  processedAt: string;
  games: OrchestrationResult[];
  totalActions: number;
}

// ============================================================
// メインオーケストレーション関数
// ============================================================

/**
 * 1つのゲームに対してオーケストレーションを実行する。
 * ゲームの現在の状態を分析し、次に必要なアクションのリストを返す。
 */
export function orchestrateGame(
  ctx: GameOrchestrationContext,
  now: Date = new Date(),
): OrchestrationResult {
  const actions: OrchestratorAction[] = [];
  const { game } = ctx;

  switch (game.status) {
    case "DRAFT":
      actions.push(...orchestrateDraft(ctx, now));
      break;
    case "COLLECTING":
      actions.push(...orchestrateCollecting(ctx, now));
      break;
    case "CONFIRMED":
      actions.push(...orchestrateConfirmed(ctx, now));
      break;
    // COMPLETED, SETTLED, CANCELLED はオーケストレーション対象外
  }

  // 優先度でソート: CRITICAL > HIGH > MEDIUM > LOW
  const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  actions.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);

  return {
    gameId: game.id,
    gameTitle: game.title,
    status: game.status,
    actions,
  };
}

/**
 * 複数ゲームをまとめてオーケストレーションする。
 */
export function orchestrateTeam(
  teamId: string,
  teamName: string,
  contexts: GameOrchestrationContext[],
  now: Date = new Date(),
): TeamOrchestrationResult {
  const games = contexts.map((ctx) => orchestrateGame(ctx, now));
  const totalActions = games.reduce((sum, g) => sum + g.actions.length, 0);

  return {
    teamId,
    teamName,
    processedAt: now.toISOString(),
    games,
    totalActions,
  };
}

// ============================================================
// ステータス別オーケストレーション
// ============================================================

/** DRAFT 状態: 出欠収集開始の提案 */
function orchestrateDraft(
  ctx: GameOrchestrationContext,
  _now: Date,
): OrchestratorAction[] {
  const actions: OrchestratorAction[] = [];
  const { game } = ctx;

  // 試合日が設定されていれば、COLLECTING への自動遷移を提案
  if (game.game_date) {
    actions.push({
      type: "AUTO_TRANSITION_TO_COLLECTING",
      priority: "HIGH",
      description: `「${game.title}」の出欠収集を開始してください`,
      gameId: game.id,
      params: { newStatus: "COLLECTING" },
    });
  }

  return actions;
}

/** COLLECTING 状態: 出欠フォロー・助っ人・対戦相手の提案 */
function orchestrateCollecting(
  ctx: GameOrchestrationContext,
  now: Date,
): OrchestratorAction[] {
  const actions: OrchestratorAction[] = [];
  const { game, rsvps, members, helperRequests, negotiations } = ctx;

  // --- 出欠状況の集計 ---
  const availableCount = rsvps.filter((r) => r.response === "AVAILABLE").length;
  const noResponseCount = rsvps.filter(
    (r) => r.response === "NO_RESPONSE",
  ).length;
  const maybeCount = rsvps.filter((r) => r.response === "MAYBE").length;
  const acceptedHelpers = helperRequests.filter(
    (h) => h.status === "ACCEPTED",
  ).length;
  const totalAvailable = availableCount + acceptedHelpers;
  const activeMembers = members.filter((m) => m.status === "ACTIVE");

  // 1. 出欠依頼がまだ送信されていない場合
  const attendanceRequestSent =
    ctx.sentNotificationTypes.includes("RSVP_REQUEST");
  if (
    !attendanceRequestSent &&
    rsvps.length === 0 &&
    activeMembers.length > 0
  ) {
    actions.push({
      type: "SEND_ATTENDANCE_REQUEST",
      priority: "CRITICAL",
      description: `「${game.title}」の出欠依頼を${activeMembers.length}人のメンバーに送信してください`,
      gameId: game.id,
      params: {
        memberCount: activeMembers.length,
      },
    });
  }

  // 2. 締切警告
  if (game.rsvp_deadline) {
    const deadline = new Date(game.rsvp_deadline);
    const hoursUntilDeadline =
      (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilDeadline > 0 && hoursUntilDeadline <= 24) {
      actions.push({
        type: "WARN_DEADLINE_APPROACHING",
        priority: "HIGH",
        description: `「${game.title}」の出欠締切まであと${Math.round(hoursUntilDeadline)}時間です。未回答: ${noResponseCount}人`,
        gameId: game.id,
        params: {
          hoursLeft: Math.round(hoursUntilDeadline),
          noResponseCount,
        },
      });
    }
  }

  // 3. リマインダー送信 (未回答者がいる場合)
  if (noResponseCount > 0 && rsvps.length > 0) {
    const reminderAlreadySent = ctx.sentNotificationTypes.includes("REMINDER");
    if (!reminderAlreadySent) {
      actions.push({
        type: "SEND_REMINDER",
        priority: "MEDIUM",
        description: `「${game.title}」の未回答者${noResponseCount}人にリマインダーを送信してください`,
        gameId: game.id,
        params: { noResponseCount, maybeCount },
      });
    }
  }

  // 4. 人数充足通知
  if (totalAvailable >= game.min_players) {
    const thresholdNotified = ctx.sentNotificationTypes.includes(
      "PLAYER_THRESHOLD_REACHED",
    );
    if (!thresholdNotified) {
      actions.push({
        type: "NOTIFY_PLAYER_THRESHOLD_REACHED",
        priority: "HIGH",
        description: `「${game.title}」の参加者が${totalAvailable}人に達しました (最低${game.min_players}人)`,
        gameId: game.id,
        params: {
          totalAvailable,
          minPlayers: game.min_players,
          availableMembers: availableCount,
          acceptedHelpers,
        },
      });
    }
  }

  // 5. 助っ人募集の提案 (人数不足の場合)
  const shortage = game.min_players - totalAvailable;
  if (shortage > 0) {
    const pendingHelperRequests = helperRequests.filter(
      (h) => h.status === "PENDING",
    ).length;
    if (pendingHelperRequests === 0) {
      actions.push({
        type: "SUGGEST_HELPER_RECRUITMENT",
        priority: "HIGH",
        description: `「${game.title}」はあと${shortage}人不足しています。助っ人を募集してください`,
        gameId: game.id,
        params: {
          shortage,
          totalAvailable,
          minPlayers: game.min_players,
        },
      });
    }
  }

  // 6. 対戦相手打診の提案 (練習以外で、グラウンド+人数目処が立っている場合)
  if (game.game_type !== "PRACTICE") {
    const hasGround = !!(game.ground_id || game.ground_name);
    const hasEnoughPlayersOrProspect =
      totalAvailable >= game.min_players ||
      totalAvailable + maybeCount >= game.min_players;
    const hasAcceptedNegotiation = negotiations.some(
      (n) => n.status === "ACCEPTED",
    );
    const hasPendingNegotiation = negotiations.some(
      (n) => n.status === "SENT" || n.status === "REPLIED",
    );

    if (
      hasGround &&
      hasEnoughPlayersOrProspect &&
      !hasAcceptedNegotiation &&
      !hasPendingNegotiation
    ) {
      actions.push({
        type: "SUGGEST_OPPONENT_CONTACT",
        priority: "MEDIUM",
        description: `「${game.title}」のグラウンドと人数の目処が立ちました。対戦相手に連絡してください`,
        gameId: game.id,
        params: {
          totalAvailable,
          hasGround,
        },
      });
    }

    // 全交渉が不成立の場合の警告
    if (
      negotiations.length > 0 &&
      negotiations.every(
        (n) => n.status === "DECLINED" || n.status === "CANCELLED",
      )
    ) {
      actions.push({
        type: "WARN_ALL_NEGOTIATIONS_FAILED",
        priority: "HIGH",
        description: `「${game.title}」のすべての対戦交渉が不成立です。新しい相手を探してください`,
        gameId: game.id,
        params: {
          failedCount: negotiations.length,
        },
      });
    }
  }

  // 7. 試合確定可能通知 (全条件充足)
  const hasGround = !!(game.ground_id || game.ground_name);
  const hasOpponent =
    game.game_type === "PRACTICE" ||
    negotiations.some((n) => n.status === "ACCEPTED");
  const hasEnoughPlayers = totalAvailable >= game.min_players;

  if (hasGround && hasOpponent && hasEnoughPlayers) {
    actions.push({
      type: "NOTIFY_READY_TO_CONFIRM",
      priority: "CRITICAL",
      description: `「${game.title}」は全条件を満たしています。確定できます (${totalAvailable}人参加, グラウンド確保済み)`,
      gameId: game.id,
      params: {
        totalAvailable,
        hasGround,
        hasOpponent,
      },
    });
  }

  return actions;
}

/** CONFIRMED 状態: 試合前の最終確認 */
function orchestrateConfirmed(
  ctx: GameOrchestrationContext,
  now: Date,
): OrchestratorAction[] {
  const actions: OrchestratorAction[] = [];
  const { game, rsvps, helperRequests } = ctx;

  // 試合日前日のリマインダー
  if (game.game_date) {
    const gameDate = new Date(game.game_date);
    const hoursUntilGame =
      (gameDate.getTime() - now.getTime()) / (1000 * 60 * 60);

    if (hoursUntilGame > 0 && hoursUntilGame <= 24) {
      const availableCount = rsvps.filter(
        (r) => r.response === "AVAILABLE",
      ).length;
      const acceptedHelpers = helperRequests.filter(
        (h) => h.status === "ACCEPTED",
      ).length;

      actions.push({
        type: "NOTIFY_GAME_READY",
        priority: "HIGH",
        description: `「${game.title}」は明日です。参加者${availableCount + acceptedHelpers}人で実施予定`,
        gameId: game.id,
        params: {
          gameDate: game.game_date,
          availableCount,
          acceptedHelpers,
          totalPlayers: availableCount + acceptedHelpers,
        },
      });
    }
  }

  return actions;
}

// ============================================================
// ユーティリティ
// ============================================================

/**
 * アクションを通知メッセージに変換する。
 * キャプテンへの LINE/メール通知用テキストを生成する。
 */
export function formatActionAsNotification(action: OrchestratorAction): string {
  const priorityEmoji: Record<OrchestratorAction["priority"], string> = {
    CRITICAL: "[重要]",
    HIGH: "[要対応]",
    MEDIUM: "[確認]",
    LOW: "[情報]",
  };

  return `${priorityEmoji[action.priority]} ${action.description}`;
}

/**
 * 複数アクションをまとめた通知サマリーを生成する。
 */
export function formatActionsAsSummary(results: OrchestrationResult[]): string {
  const activeGames = results.filter((r) => r.actions.length > 0);
  if (activeGames.length === 0) {
    return "現在、対応が必要な試合はありません。";
  }

  const lines: string[] = [];
  for (const game of activeGames) {
    lines.push(`--- ${game.gameTitle} (${game.status}) ---`);
    for (const action of game.actions) {
      lines.push(formatActionAsNotification(action));
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}
