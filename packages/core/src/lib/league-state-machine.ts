// ============================================================
// リーグ状態遷移 — Issue #111
// ============================================================
import type { LeagueStatus } from "../types/domain";

const LEAGUE_TRANSITIONS: Record<LeagueStatus, readonly LeagueStatus[]> = {
  DRAFT: ["RECRUITING", "CANCELLED"],
  RECRUITING: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export function canLeagueTransition(
  from: LeagueStatus,
  to: LeagueStatus,
): boolean {
  return LEAGUE_TRANSITIONS[from]?.includes(to) ?? false;
}

export function getAvailableLeagueTransitions(
  status: LeagueStatus,
): readonly LeagueStatus[] {
  return LEAGUE_TRANSITIONS[status] ?? [];
}

export type LeagueTransitionCheck = {
  allowed: boolean;
  reason?: string;
};

/**
 * コンテキスト付きリーグ遷移チェック
 * RECRUITING → IN_PROGRESS には2チーム以上の参加承認が必要
 */
export function canLeagueTransitionWithContext(
  from: LeagueStatus,
  to: LeagueStatus,
  context: { accepted_team_count: number },
): LeagueTransitionCheck {
  if (!canLeagueTransition(from, to)) {
    return { allowed: false, reason: `${from} → ${to} は無効な遷移です` };
  }

  if (from === "RECRUITING" && to === "IN_PROGRESS") {
    if (context.accepted_team_count < 2) {
      return {
        allowed: false,
        reason: `開始には2チーム以上の参加承認が必要です（現在: ${context.accepted_team_count}チーム）`,
      };
    }
  }

  return { allowed: true };
}
