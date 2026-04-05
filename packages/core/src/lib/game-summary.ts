// ============================================================
// ゲームサマリー — ダッシュボード用の集計ユーティリティ
// ============================================================
import type {
  Game,
  GameStatus,
  HelperRequest,
  Negotiation,
  Rsvp,
} from "../types/domain";

/** ゲームの出欠サマリー */
export interface RsvpSummary {
  available: number;
  unavailable: number;
  maybe: number;
  noResponse: number;
  total: number;
  responseRate: number;
}

/** ゲームの交渉サマリー */
export interface NegotiationSummary {
  total: number;
  accepted: number;
  pending: number;
  declined: number;
}

/** ゲームの助っ人サマリー */
export interface HelperSummary {
  total: number;
  accepted: number;
  pending: number;
  declined: number;
}

/** ゲームの総合サマリー */
export interface GameSummary {
  game: Game;
  rsvp: RsvpSummary;
  negotiation: NegotiationSummary;
  helper: HelperSummary;
  readiness: GameReadiness;
}

/** ゲーム準備状況 */
export interface GameReadiness {
  /** 人数充足 */
  hasEnoughPlayers: boolean;
  /** 対戦相手確保 (練習の場合は常にtrue) */
  hasOpponent: boolean;
  /** グラウンド確保 */
  hasGround: boolean;
  /** 全条件を満たしている */
  isReady: boolean;
  /** 準備進捗率 (0〜1) */
  progress: number;
}

/**
 * RSVP の集計を行う
 */
export function summarizeRsvps(rsvps: Rsvp[]): RsvpSummary {
  const available = rsvps.filter((r) => r.response === "AVAILABLE").length;
  const unavailable = rsvps.filter((r) => r.response === "UNAVAILABLE").length;
  const maybe = rsvps.filter((r) => r.response === "MAYBE").length;
  const noResponse = rsvps.filter((r) => r.response === "NO_RESPONSE").length;
  const total = rsvps.length;
  const responded = total - noResponse;
  const responseRate = total > 0 ? responded / total : 0;

  return { available, unavailable, maybe, noResponse, total, responseRate };
}

/**
 * 交渉の集計を行う
 */
export function summarizeNegotiations(
  negotiations: Negotiation[],
): NegotiationSummary {
  return {
    total: negotiations.length,
    accepted: negotiations.filter((n) => n.status === "ACCEPTED").length,
    pending: negotiations.filter(
      (n) =>
        n.status === "DRAFT" || n.status === "SENT" || n.status === "REPLIED",
    ).length,
    declined: negotiations.filter(
      (n) => n.status === "DECLINED" || n.status === "CANCELLED",
    ).length,
  };
}

/**
 * 助っ人リクエストの集計を行う
 */
export function summarizeHelperRequests(
  requests: HelperRequest[],
): HelperSummary {
  return {
    total: requests.length,
    accepted: requests.filter((r) => r.status === "ACCEPTED").length,
    pending: requests.filter((r) => r.status === "PENDING").length,
    declined: requests.filter(
      (r) => r.status === "DECLINED" || r.status === "CANCELLED",
    ).length,
  };
}

/**
 * ゲームの準備状況を判定する
 */
export function assessReadiness(
  game: Game,
  rsvpSummary: RsvpSummary,
  helperSummary: HelperSummary,
  negotiationSummary: NegotiationSummary,
): GameReadiness {
  const totalAvailable = rsvpSummary.available + helperSummary.accepted;
  const hasEnoughPlayers = totalAvailable >= game.min_players;
  const hasOpponent =
    game.game_type === "PRACTICE" || negotiationSummary.accepted > 0;
  const hasGround = !!(game.ground_id || game.ground_name);
  const isReady = hasEnoughPlayers && hasOpponent && hasGround;

  // 進捗率計算 (3条件の加重平均)
  let progress = 0;
  if (hasEnoughPlayers) progress += 0.4;
  else progress += 0.4 * Math.min(totalAvailable / game.min_players, 0.99);
  if (hasOpponent) progress += 0.3;
  if (hasGround) progress += 0.3;

  return {
    hasEnoughPlayers,
    hasOpponent,
    hasGround,
    isReady,
    progress: Math.round(progress * 100) / 100,
  };
}

/**
 * ゲームの総合サマリーを作成する
 */
export function createGameSummary(
  game: Game,
  rsvps: Rsvp[],
  helperRequests: HelperRequest[],
  negotiations: Negotiation[],
): GameSummary {
  const rsvp = summarizeRsvps(rsvps);
  const helper = summarizeHelperRequests(helperRequests);
  const negotiation = summarizeNegotiations(negotiations);
  const readiness = assessReadiness(game, rsvp, helper, negotiation);

  return { game, rsvp, negotiation, helper, readiness };
}

/**
 * ステータス別のゲーム件数を集計する
 */
export function countByStatus(games: Game[]): Record<GameStatus, number> {
  const counts: Record<GameStatus, number> = {
    DRAFT: 0,
    COLLECTING: 0,
    CONFIRMED: 0,
    COMPLETED: 0,
    SETTLED: 0,
    CANCELLED: 0,
  };

  for (const game of games) {
    counts[game.status]++;
  }

  return counts;
}
