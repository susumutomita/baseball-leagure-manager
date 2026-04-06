import { describe, expect, it } from "vitest";
import {
  assessReadiness,
  countByStatus,
  createGameSummary,
  summarizeHelperRequests,
  summarizeNegotiations,
  summarizeRsvps,
} from "../lib/game-summary";
import type { Game, HelperRequest, Negotiation, Rsvp } from "../types/domain";

// --- テストヘルパー ---

function createGame(overrides: Partial<Game> = {}): Game {
  return {
    id: "game-1",
    team_id: "team-1",
    title: "テスト試合",
    game_type: "FRIENDLY",
    status: "COLLECTING",
    game_date: "2026-05-01",
    start_time: "09:00",
    end_time: "12:00",
    ground_id: "ground-1",
    ground_name: "テスト球場",
    opponent_team_id: null,
    min_players: 9,
    rsvp_deadline: "2026-04-20T00:00:00Z",
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

function createRsvp(
  memberId: string,
  response: "AVAILABLE" | "UNAVAILABLE" | "MAYBE" | "NO_RESPONSE" = "AVAILABLE",
): Rsvp {
  return {
    id: `rsvp-${memberId}`,
    game_id: "game-1",
    member_id: memberId,
    response,
    responded_at: response !== "NO_RESPONSE" ? "2026-04-01T00:00:00Z" : null,
    response_channel: "APP",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  };
}

function createNegotiation(overrides: Partial<Negotiation> = {}): Negotiation {
  return {
    id: "neg-1",
    game_id: "game-1",
    opponent_team_id: "opp-1",
    status: "ACCEPTED",
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

function createHelperRequest(
  overrides: Partial<HelperRequest> = {},
): HelperRequest {
  return {
    id: "hr-1",
    game_id: "game-1",
    helper_id: "helper-1",
    status: "ACCEPTED",
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

// --- summarizeRsvps ---

describe("summarizeRsvps", () => {
  it("各回答の件数を正しく集計する", () => {
    const rsvps = [
      createRsvp("m-1", "AVAILABLE"),
      createRsvp("m-2", "AVAILABLE"),
      createRsvp("m-3", "UNAVAILABLE"),
      createRsvp("m-4", "MAYBE"),
      createRsvp("m-5", "NO_RESPONSE"),
    ];
    const result = summarizeRsvps(rsvps);
    expect(result.available).toBe(2);
    expect(result.unavailable).toBe(1);
    expect(result.maybe).toBe(1);
    expect(result.noResponse).toBe(1);
    expect(result.total).toBe(5);
    expect(result.responseRate).toBe(0.8);
  });

  it("空配列のとき全て0を返す", () => {
    const result = summarizeRsvps([]);
    expect(result.total).toBe(0);
    expect(result.responseRate).toBe(0);
  });
});

// --- summarizeNegotiations ---

describe("summarizeNegotiations", () => {
  it("各ステータスの件数を正しく集計する", () => {
    const negotiations = [
      createNegotiation({ id: "n-1", status: "ACCEPTED" }),
      createNegotiation({ id: "n-2", status: "SENT" }),
      createNegotiation({ id: "n-3", status: "DECLINED" }),
      createNegotiation({ id: "n-4", status: "REPLIED" }),
    ];
    const result = summarizeNegotiations(negotiations);
    expect(result.total).toBe(4);
    expect(result.accepted).toBe(1);
    expect(result.pending).toBe(2); // SENT + REPLIED
    expect(result.declined).toBe(1);
  });
});

// --- summarizeHelperRequests ---

describe("summarizeHelperRequests", () => {
  it("各ステータスの件数を正しく集計する", () => {
    const requests = [
      createHelperRequest({ id: "h-1", status: "ACCEPTED" }),
      createHelperRequest({ id: "h-2", status: "PENDING" }),
      createHelperRequest({ id: "h-3", status: "DECLINED" }),
    ];
    const result = summarizeHelperRequests(requests);
    expect(result.total).toBe(3);
    expect(result.accepted).toBe(1);
    expect(result.pending).toBe(1);
    expect(result.declined).toBe(1);
  });
});

// --- assessReadiness ---

describe("assessReadiness", () => {
  describe("全条件を満たしているとき", () => {
    it("isReadyがtrue、progressが1.0になる", () => {
      const result = assessReadiness(
        createGame(),
        {
          available: 10,
          unavailable: 0,
          maybe: 0,
          noResponse: 0,
          total: 10,
          responseRate: 1,
        },
        { total: 0, accepted: 0, pending: 0, declined: 0 },
        { total: 1, accepted: 1, pending: 0, declined: 0 },
      );
      expect(result.isReady).toBe(true);
      expect(result.progress).toBe(1);
    });
  });

  describe("人数不足のとき", () => {
    it("isReadyがfalseで進捗率が1未満", () => {
      const result = assessReadiness(
        createGame({ min_players: 9 }),
        {
          available: 5,
          unavailable: 0,
          maybe: 0,
          noResponse: 4,
          total: 9,
          responseRate: 0.56,
        },
        { total: 0, accepted: 0, pending: 0, declined: 0 },
        { total: 1, accepted: 1, pending: 0, declined: 0 },
      );
      expect(result.isReady).toBe(false);
      expect(result.hasEnoughPlayers).toBe(false);
      expect(result.progress).toBeLessThan(1);
    });
  });

  describe("練習のとき", () => {
    it("対戦相手なしでもhasOpponentがtrue", () => {
      const result = assessReadiness(
        createGame({ game_type: "PRACTICE" }),
        {
          available: 9,
          unavailable: 0,
          maybe: 0,
          noResponse: 0,
          total: 9,
          responseRate: 1,
        },
        { total: 0, accepted: 0, pending: 0, declined: 0 },
        { total: 0, accepted: 0, pending: 0, declined: 0 },
      );
      expect(result.hasOpponent).toBe(true);
    });
  });

  describe("グラウンド未設定のとき", () => {
    it("hasGroundがfalse", () => {
      const result = assessReadiness(
        createGame({ ground_id: null, ground_name: null }),
        {
          available: 9,
          unavailable: 0,
          maybe: 0,
          noResponse: 0,
          total: 9,
          responseRate: 1,
        },
        { total: 0, accepted: 0, pending: 0, declined: 0 },
        { total: 1, accepted: 1, pending: 0, declined: 0 },
      );
      expect(result.hasGround).toBe(false);
      expect(result.isReady).toBe(false);
    });
  });

  describe("助っ人込みで人数が満たされるとき", () => {
    it("hasEnoughPlayersがtrue", () => {
      const result = assessReadiness(
        createGame({ min_players: 9 }),
        {
          available: 7,
          unavailable: 0,
          maybe: 0,
          noResponse: 2,
          total: 9,
          responseRate: 0.78,
        },
        { total: 3, accepted: 2, pending: 1, declined: 0 },
        { total: 1, accepted: 1, pending: 0, declined: 0 },
      );
      expect(result.hasEnoughPlayers).toBe(true); // 7 + 2 = 9
    });
  });
});

// --- createGameSummary ---

describe("createGameSummary", () => {
  it("全サマリーを統合して返す", () => {
    const game = createGame();
    const rsvps = Array.from({ length: 9 }, (_, i) => createRsvp(`m-${i + 1}`));
    const helpers = [createHelperRequest()];
    const negotiations = [createNegotiation()];

    const summary = createGameSummary(game, rsvps, helpers, negotiations);
    expect(summary.game.id).toBe("game-1");
    expect(summary.rsvp.available).toBe(9);
    expect(summary.helper.accepted).toBe(1);
    expect(summary.negotiation.accepted).toBe(1);
    expect(summary.readiness.isReady).toBe(true);
  });
});

// --- countByStatus ---

describe("countByStatus", () => {
  it("ステータス別の件数を正しく集計する", () => {
    const games = [
      createGame({ id: "g-1", status: "DRAFT" }),
      createGame({ id: "g-2", status: "COLLECTING" }),
      createGame({ id: "g-3", status: "COLLECTING" }),
      createGame({ id: "g-4", status: "CONFIRMED" }),
      createGame({ id: "g-5", status: "CANCELLED" }),
    ];
    const result = countByStatus(games);
    expect(result.DRAFT).toBe(1);
    expect(result.COLLECTING).toBe(2);
    expect(result.CONFIRMED).toBe(1);
    expect(result.COMPLETED).toBe(0);
    expect(result.SETTLED).toBe(0);
    expect(result.CANCELLED).toBe(1);
  });

  it("空配列のとき全て0を返す", () => {
    const result = countByStatus([]);
    expect(result.DRAFT).toBe(0);
    expect(result.CANCELLED).toBe(0);
  });
});
