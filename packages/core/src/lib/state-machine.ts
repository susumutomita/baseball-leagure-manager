// ============================================================
// Game ステートマシン (v2)
// DRAFT → COLLECTING → ASSESSING → ARRANGING → CONFIRMED → COMPLETED → SETTLED
// ============================================================
import type {
  GameStatus,
  HelperRequestStatus,
  NegotiationStatus,
} from "../types/domain";

/** 許可される状態遷移のマップ */
const GAME_TRANSITIONS: Record<GameStatus, GameStatus[]> = {
  DRAFT: ["COLLECTING", "CONFIRMED", "CANCELLED"],
  COLLECTING: ["ASSESSING", "CANCELLED"],
  ASSESSING: ["ARRANGING", "CANCELLED"],
  ARRANGING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "CANCELLED"],
  COMPLETED: ["SETTLED"],
  SETTLED: [],
  CANCELLED: [],
};

// 注: DRAFT → CONFIRMED は練習(PRACTICE)の簡略フロー

export function canTransition(from: GameStatus, to: GameStatus): boolean {
  return GAME_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getAvailableTransitions(current: GameStatus): GameStatus[] {
  return GAME_TRANSITIONS[current] ?? [];
}

export class InvalidTransitionError extends Error {
  constructor(from: string, to: string) {
    super(`状態遷移が不正です: ${from} → ${to}`);
    this.name = "InvalidTransitionError";
  }
}

export function assertTransition(from: GameStatus, to: GameStatus): void {
  if (!canTransition(from, to)) {
    throw new InvalidTransitionError(from, to);
  }
}

// ============================================================
// Negotiation ステートマシン
// ============================================================

const NEGOTIATION_TRANSITIONS: Record<NegotiationStatus, NegotiationStatus[]> =
  {
    DRAFT: ["SENT", "CANCELLED"],
    SENT: ["REPLIED", "DECLINED", "CANCELLED"],
    REPLIED: ["ACCEPTED", "DECLINED", "CANCELLED"],
    ACCEPTED: ["CANCELLED"],
    DECLINED: [],
    CANCELLED: [],
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
    throw new InvalidTransitionError(from, to);
  }
}

// ============================================================
// HelperRequest ステートマシン
// ============================================================

const HELPER_REQUEST_TRANSITIONS: Record<
  HelperRequestStatus,
  HelperRequestStatus[]
> = {
  PENDING: ["ACCEPTED", "DECLINED", "CANCELLED"],
  ACCEPTED: ["CANCELLED"],
  DECLINED: [],
  CANCELLED: [],
};

export function canHelperRequestTransition(
  from: HelperRequestStatus,
  to: HelperRequestStatus,
): boolean {
  return HELPER_REQUEST_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertHelperRequestTransition(
  from: HelperRequestStatus,
  to: HelperRequestStatus,
): void {
  if (!canHelperRequestTransition(from, to)) {
    throw new InvalidTransitionError(from, to);
  }
}
