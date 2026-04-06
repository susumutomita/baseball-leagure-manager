// ============================================================
// 出欠可視性制御 — Issue #117
// チーム設定に基づいてRSVP情報の公開範囲を制御
// ============================================================
import type { Rsvp, RsvpVisibilityMode } from "../types/domain";

export type RsvpAggregate = {
  available: number;
  unavailable: number;
  maybe: number;
  no_response: number;
  total: number;
};

export type FilteredRsvpView =
  | { mode: "ALL"; rsvps: Rsvp[] }
  | { mode: "ADMIN_ONLY"; aggregate: RsvpAggregate }
  | { mode: "AGGREGATE_ONLY"; aggregate: RsvpAggregate };

/**
 * RSVPを集計
 */
export function aggregateRsvps(rsvps: Rsvp[]): RsvpAggregate {
  return {
    available: rsvps.filter((r) => r.response === "AVAILABLE").length,
    unavailable: rsvps.filter((r) => r.response === "UNAVAILABLE").length,
    maybe: rsvps.filter((r) => r.response === "MAYBE").length,
    no_response: rsvps.filter((r) => r.response === "NO_RESPONSE").length,
    total: rsvps.length,
  };
}

/**
 * 可視性設定に基づいてRSVPデータをフィルタ
 * - ALL: 全員に個別回答を公開
 * - ADMIN_ONLY: 管理者以外には集計のみ
 * - AGGREGATE_ONLY: 全員に集計のみ（管理者含む）
 */
export function filterRsvpsForVisibility(
  rsvps: Rsvp[],
  visibilityMode: RsvpVisibilityMode,
  isAdmin: boolean,
): FilteredRsvpView {
  if (visibilityMode === "ALL" || isAdmin) {
    return { mode: "ALL", rsvps };
  }
  return { mode: visibilityMode, aggregate: aggregateRsvps(rsvps) };
}
