// ============================================================
// 出欠デフォルト処理 — Issue #117
// 締切後に未回答を自動的に不参加扱いにする
// ============================================================
import type { Game, Rsvp } from "../types/domain";

export type RsvpDefaultResult = {
  game_id: string;
  affected_member_ids: string[];
  default_response: "UNAVAILABLE";
  reason: string;
};

/**
 * 締切を過ぎた未回答RSVPを不参加扱いにするデータを生成
 */
export function processDeadlineDefaults(
  game: Game,
  rsvps: Rsvp[],
  now: Date = new Date(),
): RsvpDefaultResult | null {
  if (!game.rsvp_deadline) return null;

  const deadline = new Date(game.rsvp_deadline);
  if (now <= deadline) return null;

  const noResponseRsvps = rsvps.filter((r) => r.response === "NO_RESPONSE");
  if (noResponseRsvps.length === 0) return null;

  return {
    game_id: game.id,
    affected_member_ids: noResponseRsvps.map((r) => r.member_id),
    default_response: "UNAVAILABLE",
    reason: `締切(${game.rsvp_deadline})を過ぎたため不参加扱い`,
  };
}
