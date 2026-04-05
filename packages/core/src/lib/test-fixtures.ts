// ============================================================
// E2E テストフィクスチャ — 共通テストデータファクトリ
// テストファイルから import して利用する
// ============================================================
import type {
  Attendance,
  Expense,
  Game,
  GameResult,
  Helper,
  HelperRequest,
  Member,
  Negotiation,
  OpponentTeam,
  Rsvp,
  Team,
} from "../types/domain";

// --- チーム ---
export function createTeamFixture(overrides: Partial<Team> = {}): Team {
  return {
    id: "team-fixture-1",
    name: "テストチーム",
    home_area: "東京都・世田谷区",
    activity_day: "日曜日",
    owner_user_id: null,
    settings_json: {},
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// --- メンバー ---
export function createMemberFixture(overrides: Partial<Member> = {}): Member {
  return {
    id: "member-fixture-1",
    team_id: "team-fixture-1",
    name: "テスト選手",
    tier: "PRO",
    line_user_id: null,
    email: null,
    expo_push_token: null,
    positions_json: [],
    jersey_number: null,
    attendance_rate: 0.8,
    no_show_rate: 0.05,
    role: "MEMBER",
    status: "ACTIVE",
    joined_at: "2026-01-01",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// --- ゲーム ---
export function createGameFixture(overrides: Partial<Game> = {}): Game {
  return {
    id: "game-fixture-1",
    team_id: "team-fixture-1",
    title: "テスト試合",
    game_type: "FRIENDLY",
    status: "COLLECTING",
    game_date: "2026-05-01",
    start_time: "09:00",
    end_time: "12:00",
    ground_id: null,
    ground_name: "テスト球場",
    opponent_team_id: null,
    min_players: 9,
    rsvp_deadline: "2026-04-28T00:00:00Z",
    note: null,
    version: 0,
    available_count: 0,
    unavailable_count: 0,
    maybe_count: 0,
    no_response_count: 0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// --- RSVP ---
export function createRsvpFixture(overrides: Partial<Rsvp> = {}): Rsvp {
  return {
    id: "rsvp-fixture-1",
    game_id: "game-fixture-1",
    member_id: "member-fixture-1",
    response: "AVAILABLE",
    responded_at: "2026-04-01T00:00:00Z",
    response_channel: "APP",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// --- 助っ人 ---
export function createHelperFixture(overrides: Partial<Helper> = {}): Helper {
  return {
    id: "helper-fixture-1",
    team_id: "team-fixture-1",
    name: "テスト助っ人",
    line_user_id: null,
    email: null,
    note: null,
    times_helped: 0,
    last_helped_at: null,
    reliability_score: 1.0,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// --- 助っ人リクエスト ---
export function createHelperRequestFixture(
  overrides: Partial<HelperRequest> = {},
): HelperRequest {
  return {
    id: "hr-fixture-1",
    game_id: "game-fixture-1",
    helper_id: "helper-fixture-1",
    status: "PENDING",
    message: null,
    sent_at: null,
    responded_at: null,
    cancelled_at: null,
    cancel_reason: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// --- 対戦相手 ---
export function createOpponentFixture(
  overrides: Partial<OpponentTeam> = {},
): OpponentTeam {
  return {
    id: "opponent-fixture-1",
    team_id: "team-fixture-1",
    name: "テスト対戦相手",
    area: null,
    contact_name: null,
    contact_email: null,
    contact_line: null,
    contact_phone: null,
    home_ground: null,
    note: null,
    times_played: 0,
    last_played_at: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// --- 交渉 ---
export function createNegotiationFixture(
  overrides: Partial<Negotiation> = {},
): Negotiation {
  return {
    id: "negotiation-fixture-1",
    game_id: "game-fixture-1",
    opponent_team_id: "opponent-fixture-1",
    status: "DRAFT",
    proposed_dates_json: ["2026-05-01"],
    message_sent: null,
    reply_received: null,
    sent_at: null,
    replied_at: null,
    cancelled_at: null,
    cancel_reason: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// --- 経費 ---
export function createExpenseFixture(
  overrides: Partial<Expense> = {},
): Expense {
  return {
    id: "expense-fixture-1",
    game_id: "game-fixture-1",
    category: "GROUND",
    amount: 5000,
    paid_by: null,
    split_with_opponent: false,
    note: null,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// --- 試合結果 ---
export function createGameResultFixture(
  overrides: Partial<GameResult> = {},
): GameResult {
  return {
    id: "result-fixture-1",
    game_id: "game-fixture-1",
    our_score: null,
    opponent_score: null,
    result: null,
    innings: 7,
    note: null,
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// --- 出席記録 ---
export function createAttendanceFixture(
  overrides: Partial<Attendance> = {},
): Attendance {
  return {
    id: "attendance-fixture-1",
    game_id: "game-fixture-1",
    person_type: "MEMBER",
    person_id: "member-fixture-1",
    status: "ATTENDED",
    recorded_at: "2026-04-01T00:00:00Z",
    recorded_by: null,
    ...overrides,
  };
}

// --- バルクファクトリ ---

/**
 * N人のメンバーを生成する
 */
export function createMembersFixture(
  count: number,
  teamId = "team-fixture-1",
): Member[] {
  return Array.from({ length: count }, (_, i) =>
    createMemberFixture({
      id: `member-fixture-${i + 1}`,
      team_id: teamId,
      name: `テスト選手${i + 1}`,
      jersey_number: i + 1,
    }),
  );
}

/**
 * N個のRSVPを生成する
 */
export function createRsvpsFixture(
  memberIds: string[],
  gameId = "game-fixture-1",
  response: Rsvp["response"] = "AVAILABLE",
): Rsvp[] {
  return memberIds.map((memberId, i) =>
    createRsvpFixture({
      id: `rsvp-fixture-${i + 1}`,
      game_id: gameId,
      member_id: memberId,
      response,
    }),
  );
}
