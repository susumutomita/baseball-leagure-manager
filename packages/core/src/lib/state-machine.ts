// ============================================================
// MatchRequest ステートマシン
// ============================================================
import type { MatchRequestStatus } from "../types/domain";

/** 許可される状態遷移のマップ */
const TRANSITIONS: Record<MatchRequestStatus, MatchRequestStatus[]> = {
  DRAFT: ["OPEN", "CANCELLED"],
  OPEN: ["MATCH_CANDIDATE_FOUND", "CANCELLED", "FAILED"],
  MATCH_CANDIDATE_FOUND: ["NEGOTIATING", "OPEN", "CANCELLED", "FAILED"],
  NEGOTIATING: ["GROUND_WAITING", "OPEN", "CANCELLED", "FAILED"],
  GROUND_WAITING: ["READY_TO_CONFIRM", "NEGOTIATING", "CANCELLED", "FAILED"],
  READY_TO_CONFIRM: ["CONFIRMED", "OPEN", "CANCELLED"],
  CONFIRMED: ["CANCELLED"],
  CANCELLED: [],
  FAILED: [],
};

export function canTransition(
  from: MatchRequestStatus,
  to: MatchRequestStatus,
): boolean {
  return TRANSITIONS[from]?.includes(to) ?? false;
}

export function getAvailableTransitions(
  current: MatchRequestStatus,
): MatchRequestStatus[] {
  return TRANSITIONS[current] ?? [];
}

export class InvalidTransitionError extends Error {
  constructor(from: MatchRequestStatus, to: MatchRequestStatus) {
    super(`状態遷移が不正です: ${from} → ${to}`);
    this.name = "InvalidTransitionError";
  }
}

export function assertTransition(
  from: MatchRequestStatus,
  to: MatchRequestStatus,
): void {
  if (!canTransition(from, to)) {
    throw new InvalidTransitionError(from, to);
  }
}

// ============================================================
// Negotiation ステートマシン
// ============================================================
import type { NegotiationStatus } from "../types/domain";

const NEGOTIATION_TRANSITIONS: Record<NegotiationStatus, NegotiationStatus[]> =
  {
    NOT_SENT: ["SENT"],
    SENT: ["REPLIED", "DECLINED"],
    REPLIED: ["ACCEPTED", "DECLINED", "COUNTER_PROPOSED"],
    ACCEPTED: [],
    DECLINED: [],
    COUNTER_PROPOSED: ["SENT", "ACCEPTED", "DECLINED"],
  };

export function canNegotiationTransition(
  from: NegotiationStatus,
  to: NegotiationStatus,
): boolean {
  return NEGOTIATION_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertNegotiationTransition(
  from: NegotiationStatus,
  to: NegotiationStatus,
): void {
  if (!canNegotiationTransition(from, to)) {
    throw new InvalidTransitionError(
      from as unknown as MatchRequestStatus,
      to as unknown as MatchRequestStatus,
    );
  }
}
