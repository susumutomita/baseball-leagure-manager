// ============================================================
// リーグ管理 — Issue #111
// ============================================================
import type { League, LeagueFormat, LeagueTeam } from "../types/domain";

export type CreateLeagueInput = {
  name: string;
  season: string;
  area?: string;
  format?: LeagueFormat;
  organizer_user_id: string;
  max_teams?: number;
};

/**
 * リーグ作成データを構築
 */
export function createLeague(
  input: CreateLeagueInput,
): Omit<League, "id" | "created_at" | "updated_at"> {
  return {
    name: input.name,
    season: input.season,
    area: input.area ?? null,
    format: input.format ?? "ROUND_ROBIN",
    organizer_user_id: input.organizer_user_id,
    status: "DRAFT",
    max_teams: input.max_teams ?? 20,
    rules_json: {},
  };
}

/**
 * チーム招待データを構築
 */
export function inviteTeam(
  leagueId: string,
  teamId: string,
): Omit<LeagueTeam, "id" | "created_at" | "updated_at"> {
  return {
    league_id: leagueId,
    team_id: teamId,
    status: "INVITED",
    joined_at: null,
  };
}

/**
 * 招待承認
 */
export function acceptInvitation(team: LeagueTeam): LeagueTeam {
  return {
    ...team,
    status: "ACCEPTED",
    joined_at: new Date().toISOString(),
  };
}

/**
 * 招待辞退
 */
export function declineInvitation(team: LeagueTeam): LeagueTeam {
  return {
    ...team,
    status: "DECLINED",
  };
}

/**
 * 参加承認済みチームを取得
 */
export function getAcceptedTeams(leagueTeams: LeagueTeam[]): LeagueTeam[] {
  return leagueTeams.filter((lt) => lt.status === "ACCEPTED");
}
