// ============================================================
// 試合成立エンジン ドメイン型定義
// ============================================================

// --- MatchRequest 状態 ---
export const MATCH_REQUEST_STATUSES = [
  "DRAFT",
  "OPEN",
  "MATCH_CANDIDATE_FOUND",
  "NEGOTIATING",
  "GROUND_WAITING",
  "READY_TO_CONFIRM",
  "CONFIRMED",
  "CANCELLED",
  "FAILED",
] as const;
export type MatchRequestStatus = (typeof MATCH_REQUEST_STATUSES)[number];

// --- Negotiation 状態 ---
export const NEGOTIATION_STATUSES = [
  "NOT_SENT",
  "SENT",
  "REPLIED",
  "ACCEPTED",
  "DECLINED",
  "COUNTER_PROPOSED",
] as const;
export type NegotiationStatus = (typeof NEGOTIATION_STATUSES)[number];

// --- MemberAvailability 状態 ---
export const AVAILABILITY_RESPONSES = [
  "UNKNOWN",
  "AVAILABLE",
  "UNAVAILABLE",
  "MAYBE",
] as const;
export type AvailabilityResponseType = (typeof AVAILABILITY_RESPONSES)[number];

// --- レベル帯 ---
export const LEVEL_BANDS = [
  "BEGINNER",
  "INTERMEDIATE",
  "ADVANCED",
  "COMPETITIVE",
] as const;
export type LevelBand = (typeof LEVEL_BANDS)[number];

// ============================================================
// エンティティ
// ============================================================

export interface Team {
  id: string;
  name: string;
  home_area: string;
  level_band: LevelBand;
  payment_method: string | null;
  policy_json: TeamPolicy | null;
  created_at: string;
  updated_at: string;
}

export interface TeamPolicy {
  preferred_days?: string[];
  max_travel_minutes?: number;
  min_level?: LevelBand;
  cost_split?: "HALF" | "HOME_PAYS" | "AWAY_PAYS";
  confirm_deadline_days?: number;
}

export interface Member {
  id: string;
  team_id: string;
  name: string;
  positions_json: string[];
  contact_type: "LINE" | "EMAIL" | "SLACK";
  contact_value: string;
  attendance_rate: number;
  status: "ACTIVE" | "INACTIVE" | "PENDING";
  created_at: string;
  updated_at: string;
}

export interface MatchRequest {
  id: string;
  team_id: string;
  title: string;
  desired_dates_json: string[];
  preferred_time_slots_json: string[];
  area: string;
  level_requirement: LevelBand | null;
  needs_ground: boolean;
  budget_limit: number | null;
  status: MatchRequestStatus;
  confidence_score: number;
  review_required: boolean;
  created_at: string;
  updated_at: string;
}

export interface OpponentTeam {
  id: string;
  name: string;
  area: string;
  level_band: LevelBand;
  contact_channel: string;
  policy_json: TeamPolicy | null;
  metadata_json: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface Negotiation {
  id: string;
  match_request_id: string;
  opponent_team_id: string;
  proposed_dates_json: string[];
  generated_message: string | null;
  reply_message: string | null;
  status: NegotiationStatus;
  created_at: string;
  updated_at: string;
}

export interface GroundWatchTarget {
  id: string;
  team_id: string;
  name: string;
  source_url: string;
  area: string;
  conditions_json: Record<string, unknown> | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface GroundAvailabilitySnapshot {
  id: string;
  ground_watch_target_id: string;
  snapshot_time: string;
  availability_json: Record<string, unknown>;
  hash: string;
  created_at: string;
}

export interface AvailabilityResponse {
  id: string;
  match_request_id: string;
  member_id: string;
  response: AvailabilityResponseType;
  comment: string | null;
  responded_at: string;
}

export interface Confirmation {
  id: string;
  match_request_id: string;
  approved_by: string;
  approved_at: string;
  status: "APPROVED" | "REJECTED";
  note: string | null;
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
