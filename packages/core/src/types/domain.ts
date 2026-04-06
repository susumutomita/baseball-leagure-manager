// ============================================================
// 試合成立エンジン v2 ドメイン型定義
// docs/data-model.md に基づく
// ============================================================

// --- Game 状態 ---
export const GAME_STATUSES = [
  "DRAFT",
  "COLLECTING",
  "CONFIRMED",
  "COMPLETED",
  "SETTLED",
  "CANCELLED",
] as const;
export type GameStatus = (typeof GAME_STATUSES)[number];

// --- Game 種別 ---
export const GAME_TYPES = [
  "PRACTICE",
  "FRIENDLY",
  "LEAGUE",
  "TOURNAMENT",
] as const;
export type GameType = (typeof GAME_TYPES)[number];

// --- RSVP 回答 ---
export const RSVP_RESPONSES = [
  "AVAILABLE",
  "UNAVAILABLE",
  "MAYBE",
  "NO_RESPONSE",
] as const;
export type RsvpResponse = (typeof RSVP_RESPONSES)[number];

// --- Negotiation 状態 ---
export const NEGOTIATION_STATUSES = [
  "DRAFT",
  "SENT",
  "REPLIED",
  "ACCEPTED",
  "DECLINED",
  "CANCELLED",
] as const;
export type NegotiationStatus = (typeof NEGOTIATION_STATUSES)[number];

// --- HelperRequest 状態 ---
export const HELPER_REQUEST_STATUSES = [
  "PENDING",
  "ACCEPTED",
  "DECLINED",
  "CANCELLED",
] as const;
export type HelperRequestStatus = (typeof HELPER_REQUEST_STATUSES)[number];

// --- メンバー区分 ---
export const MEMBER_TIERS = ["PRO", "LITE"] as const;
export type MemberTier = (typeof MEMBER_TIERS)[number];

// --- メンバー Role ---
export const MEMBER_ROLES = ["SUPER_ADMIN", "ADMIN", "MEMBER"] as const;
export type MemberRole = (typeof MEMBER_ROLES)[number];

// ============================================================
// エンティティ
// ============================================================

export interface Team {
  id: string;
  name: string;
  home_area: string;
  activity_day: string | null;
  owner_user_id: string | null;
  settings_json: TeamSettings;
  created_at: string;
  updated_at: string;
}

export interface TeamSettings {
  reminder_hours?: number[];
  deadline_days_before?: number;
  default_innings?: number;
}

export interface Member {
  id: string;
  team_id: string;
  name: string;
  tier: MemberTier;
  line_user_id: string | null;
  email: string | null;
  expo_push_token: string | null;
  positions_json: string[];
  jersey_number: number | null;
  attendance_rate: number;
  no_show_rate: number;
  role: MemberRole;
  status: "ACTIVE" | "INACTIVE" | "PENDING";
  joined_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Helper {
  id: string;
  team_id: string;
  name: string;
  line_user_id: string | null;
  email: string | null;
  note: string | null;
  times_helped: number;
  last_helped_at: string | null;
  reliability_score: number;
  created_at: string;
  updated_at: string;
}

export interface Game {
  id: string;
  team_id: string;
  title: string;
  game_type: GameType;
  status: GameStatus;
  game_date: string | null;
  start_time: string | null;
  end_time: string | null;
  ground_id: string | null;
  ground_name: string | null;
  opponent_team_id: string | null;
  min_players: number;
  rsvp_deadline: string | null;
  note: string | null;
  version: number;
  available_count: number;
  unavailable_count: number;
  maybe_count: number;
  no_response_count: number;
  created_at: string;
  updated_at: string;
}

export interface Rsvp {
  id: string;
  game_id: string;
  member_id: string;
  response: RsvpResponse;
  responded_at: string | null;
  response_channel: "APP" | "LINE" | "EMAIL" | "WEB" | null;
  created_at: string;
  updated_at: string;
}

export interface Attendance {
  id: string;
  game_id: string;
  person_type: "MEMBER" | "HELPER";
  person_id: string;
  status: "ATTENDED" | "NO_SHOW" | "CANCELLED_SAME_DAY";
  recorded_at: string;
  recorded_by: string | null;
}

export interface HelperRequest {
  id: string;
  game_id: string;
  helper_id: string;
  status: HelperRequestStatus;
  message: string | null;
  sent_at: string | null;
  responded_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface OpponentTeam {
  id: string;
  team_id: string;
  name: string;
  area: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_line: string | null;
  contact_phone: string | null;
  home_ground: string | null;
  note: string | null;
  times_played: number;
  last_played_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Negotiation {
  id: string;
  game_id: string;
  opponent_team_id: string;
  status: NegotiationStatus;
  proposed_dates_json: string[];
  message_sent: string | null;
  reply_received: string | null;
  sent_at: string | null;
  replied_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface Ground {
  id: string;
  team_id: string;
  name: string;
  municipality: string;
  source_url: string | null;
  cost_per_slot: number | null;
  is_hardball_ok: boolean;
  has_night_lights: boolean;
  note: string | null;
  watch_active: boolean;
  conditions_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface GroundSlot {
  id: string;
  ground_id: string;
  date: string;
  time_slot: "MORNING" | "AFTERNOON" | "EVENING";
  status: "AVAILABLE" | "RESERVED" | "UNAVAILABLE";
  detected_at: string;
  reserved_game_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Expense {
  id: string;
  game_id: string;
  category: "GROUND" | "UMPIRE" | "BALL" | "DRINK" | "TOURNAMENT_FEE" | "OTHER";
  amount: number;
  paid_by: string | null;
  split_with_opponent: boolean;
  note: string | null;
  created_at: string;
}

export interface Settlement {
  id: string;
  game_id: string;
  total_cost: number;
  opponent_share: number;
  team_cost: number;
  member_count: number;
  per_member: number;
  status: "DRAFT" | "NOTIFIED" | "SETTLED";
  settled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface GameResult {
  id: string;
  game_id: string;
  our_score: number | null;
  opponent_score: number | null;
  result: "WIN" | "LOSE" | "DRAW" | null;
  innings: number;
  note: string | null;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_type: "USER" | "SYSTEM" | "AI";
  actor_id: string;
  action: string;
  target_type: string;
  target_id: string;
  before_json: Record<string, unknown> | null;
  after_json: Record<string, unknown> | null;
  created_at: string;
}

// ============================================================
// リーグ運営
// ============================================================

// --- League 状態 ---
export const LEAGUE_STATUSES = [
  "DRAFT",
  "RECRUITING",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
] as const;
export type LeagueStatus = (typeof LEAGUE_STATUSES)[number];

// --- League フォーマット ---
export const LEAGUE_FORMATS = [
  "ROUND_ROBIN",
  "TOURNAMENT",
  "DOUBLE_ROUND_ROBIN",
] as const;
export type LeagueFormat = (typeof LEAGUE_FORMATS)[number];

// --- LeagueTeam 状態 ---
export const LEAGUE_TEAM_STATUSES = [
  "INVITED",
  "ACCEPTED",
  "DECLINED",
  "WITHDRAWN",
] as const;
export type LeagueTeamStatus = (typeof LEAGUE_TEAM_STATUSES)[number];

// --- LeagueMatch 状態 ---
export const LEAGUE_MATCH_STATUSES = [
  "SCHEDULED",
  "COMPLETED",
  "CANCELLED",
  "POSTPONED",
] as const;
export type LeagueMatchStatus = (typeof LEAGUE_MATCH_STATUSES)[number];

export interface League {
  id: string;
  name: string;
  season: string;
  area: string | null;
  format: LeagueFormat;
  organizer_user_id: string;
  status: LeagueStatus;
  max_teams: number;
  rules_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface LeagueTeam {
  id: string;
  league_id: string;
  team_id: string;
  status: LeagueTeamStatus;
  joined_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LeagueMatch {
  id: string;
  league_id: string;
  home_team_id: string;
  away_team_id: string;
  round: number;
  match_number: number;
  game_id: string | null;
  scheduled_date: string | null;
  ground_id: string | null;
  status: LeagueMatchStatus;
  home_score: number | null;
  away_score: number | null;
  created_at: string;
  updated_at: string;
}

export interface LeagueStanding {
  id: string;
  league_id: string;
  team_id: string;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  runs_for: number;
  runs_against: number;
  games_played: number;
  created_at: string;
  updated_at: string;
}

// ============================================================
// バイラル設計
// ============================================================

// --- 招待タイプ ---
export const INVITE_TYPES = ["OPPONENT", "HELPER", "LEAGUE", "MEMBER"] as const;
export type InviteType = (typeof INVITE_TYPES)[number];

// --- スキルレベル ---
export const SKILL_LEVELS = [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
  "COMPETITIVE",
] as const;
export type SkillLevel = (typeof SKILL_LEVELS)[number];

export interface TeamInvitation {
  id: string;
  team_id: string;
  invite_type: InviteType;
  invite_code: string;
  created_by: string;
  expires_at: string | null;
  max_uses: number | null;
  use_count: number;
  metadata_json: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface TeamProfile {
  id: string;
  team_id: string;
  is_public: boolean;
  description: string | null;
  activity_area: string | null;
  skill_level: SkillLevel | null;
  member_count: number;
  founded_year: number | null;
  looking_for_opponents: boolean;
  looking_for_helpers: boolean;
  photo_url: string | null;
  stats_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface InvitationUse {
  id: string;
  invitation_id: string;
  used_by_user_id: string | null;
  used_by_team_id: string | null;
  used_at: string;
}

// ============================================================
// コア機能強化 (RSVP設定)
// ============================================================

export type RsvpVisibilityMode = "ALL" | "ADMIN_ONLY" | "AGGREGATE_ONLY";

export interface TeamRsvpSettings {
  deadline_default_response: "UNAVAILABLE" | "NO_RESPONSE";
  rsvp_visibility: RsvpVisibilityMode;
  reminder_escalation: boolean;
  early_bird_priority: boolean;
}
