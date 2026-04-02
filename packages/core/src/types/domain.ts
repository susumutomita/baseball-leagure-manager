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
