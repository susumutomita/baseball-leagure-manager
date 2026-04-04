// ============================================================
// Webhook イベント型定義 — 外部連携用のイベント構造
// ============================================================
import type { GameStatus, NegotiationStatus } from "../types/domain";

/** イベントタイプ */
export const WEBHOOK_EVENT_TYPES = [
  "game.created",
  "game.updated",
  "game.transition",
  "game.cancelled",
  "game.confirmed",
  "game.completed",
  "rsvp.responded",
  "negotiation.created",
  "negotiation.updated",
  "helper.requested",
  "helper.responded",
  "settlement.calculated",
  "settlement.completed",
] as const;
export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

/** Webhook イベントの基本構造 */
export interface WebhookEvent<T = unknown> {
  id: string;
  type: WebhookEventType;
  timestamp: string;
  teamId: string;
  payload: T;
}

/** ゲーム状態遷移イベントのペイロード */
export interface GameTransitionPayload {
  gameId: string;
  title: string;
  fromStatus: GameStatus;
  toStatus: GameStatus;
  actorId: string;
}

/** RSVP 回答イベントのペイロード */
export interface RsvpRespondedPayload {
  gameId: string;
  memberId: string;
  response: "AVAILABLE" | "UNAVAILABLE" | "MAYBE";
  previousResponse: string | null;
}

/** 交渉更新イベントのペイロード */
export interface NegotiationUpdatedPayload {
  gameId: string;
  negotiationId: string;
  opponentTeamName: string;
  fromStatus: NegotiationStatus;
  toStatus: NegotiationStatus;
}

/** 精算完了イベントのペイロード */
export interface SettlementCompletedPayload {
  gameId: string;
  totalCost: number;
  perMember: number;
  memberCount: number;
}

/**
 * Webhook イベントを構築する
 */
export function createWebhookEvent<T>(
  type: WebhookEventType,
  teamId: string,
  payload: T,
): WebhookEvent<T> {
  return {
    id: generateEventId(),
    type,
    timestamp: new Date().toISOString(),
    teamId,
    payload,
  };
}

function generateEventId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `evt_${timestamp}_${random}`;
}

/**
 * イベントが特定のタイプかチェックする型ガード
 */
export function isGameTransitionEvent(
  event: WebhookEvent,
): event is WebhookEvent<GameTransitionPayload> {
  return event.type === "game.transition";
}

export function isRsvpRespondedEvent(
  event: WebhookEvent,
): event is WebhookEvent<RsvpRespondedPayload> {
  return event.type === "rsvp.responded";
}
