import { describe, expect, it } from "bun:test";
import {
  canArrange,
  canAssess,
  canConfirm,
  checkHelperFulfillment,
  checkStopConditions,
} from "../lib/governor";
import type { Game, HelperRequest, Negotiation, Rsvp } from "../types/domain";

// --- テストヘルパー ---

function createGame(overrides: Partial<Game> = {}): Game {
  return {
    id: "game-1",
    team_id: "team-1",
    title: "テスト試合",
    game_type: "FRIENDLY",
    status: "ARRANGING",
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

function createHelperRequest(
  overrides: Partial<HelperRequest> = {},
): HelperRequest {
  return {
    id: "hr-1",
    game_id: "game-1",
    helper_id: "helper-1",
    status: "ACCEPTED",
    message: null,
    sent_at: "2026-04-01T00:00:00Z",
    responded_at: "2026-04-02T00:00:00Z",
    cancelled_at: null,
    cancel_reason: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
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
    sent_at: "2026-04-01T00:00:00Z",
    replied_at: "2026-04-02T00:00:00Z",
    cancelled_at: null,
    cancel_reason: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// --- canAssess ---

describe("canAssess", () => {
  describe("全員回答済みのとき", () => {
    it("判定を許可する", () => {
      const result = canAssess({
        game: createGame(),
        rsvps: Array.from({ length: 15 }, (_, i) => createRsvp(`m-${i + 1}`)),
        totalMembers: 15,
      });
      expect(result.allowed).toBe(true);
    });
  });

  describe("締切が過ぎているとき", () => {
    it("未回答者がいても判定を許可する", () => {
      const result = canAssess({
        game: createGame({ rsvp_deadline: "2020-01-01T00:00:00Z" }),
        rsvps: [createRsvp("m-1"), createRsvp("m-2", "NO_RESPONSE")],
        totalMembers: 15,
      });
      expect(result.allowed).toBe(true);
    });
  });

  describe("未回答者がいて締切前のとき", () => {
    it("判定を許可しない", () => {
      const result = canAssess({
        game: createGame({ rsvp_deadline: "2099-12-31T00:00:00Z" }),
        rsvps: [createRsvp("m-1"), createRsvp("m-2", "NO_RESPONSE")],
        totalMembers: 15,
      });
      expect(result.allowed).toBe(false);
      expect(result.reasons[0]).toContain("未回答者");
    });
  });

  describe("締切が未設定で未回答者がいるとき", () => {
    it("判定を許可しない", () => {
      const result = canAssess({
        game: createGame({ rsvp_deadline: null }),
        rsvps: [createRsvp("m-1"), createRsvp("m-2", "NO_RESPONSE")],
        totalMembers: 15,
      });
      expect(result.allowed).toBe(false);
    });
  });
});

// --- canArrange ---

describe("canArrange", () => {
  describe("メンバーだけで人数が足りるとき", () => {
    it("手配を許可する", () => {
      const result = canArrange({
        game: createGame({ min_players: 9 }),
        rsvps: Array.from({ length: 9 }, (_, i) => createRsvp(`m-${i + 1}`)),
        helperRequests: [],
      });
      expect(result.allowed).toBe(true);
    });
  });

  describe("メンバー+助っ人で人数が足りるとき", () => {
    it("手配を許可する", () => {
      const result = canArrange({
        game: createGame({ min_players: 9 }),
        rsvps: Array.from({ length: 7 }, (_, i) => createRsvp(`m-${i + 1}`)),
        helperRequests: [
          createHelperRequest({ id: "hr-1", status: "ACCEPTED" }),
          createHelperRequest({ id: "hr-2", status: "ACCEPTED" }),
        ],
      });
      expect(result.allowed).toBe(true);
    });
  });

  describe("人数が足りないとき", () => {
    it("手配を許可しない", () => {
      const result = canArrange({
        game: createGame({ min_players: 9 }),
        rsvps: Array.from({ length: 5 }, (_, i) => createRsvp(`m-${i + 1}`)),
        helperRequests: [],
      });
      expect(result.allowed).toBe(false);
      expect(result.reasons[0]).toContain("参加可能人数が不足");
    });
  });

  describe("人数がギリギリのとき", () => {
    it("reviewRequiredをtrueにする", () => {
      const result = canArrange({
        game: createGame({ min_players: 9 }),
        rsvps: Array.from({ length: 9 }, (_, i) => createRsvp(`m-${i + 1}`)),
        helperRequests: [],
      });
      expect(result.reviewRequired).toBe(true);
    });

    it("余裕があればreviewRequiredはfalse", () => {
      const result = canArrange({
        game: createGame({ min_players: 9 }),
        rsvps: Array.from({ length: 12 }, (_, i) => createRsvp(`m-${i + 1}`)),
        helperRequests: [],
      });
      expect(result.reviewRequired).toBe(false);
    });
  });
});

// --- canConfirm ---

describe("canConfirm", () => {
  describe("すべての条件を満たしているとき", () => {
    it("確定を許可する", () => {
      const result = canConfirm({
        game: createGame(),
        rsvps: Array.from({ length: 9 }, (_, i) => createRsvp(`m-${i + 1}`)),
        helperRequests: [],
        negotiations: [createNegotiation()],
        hasGround: true,
      });
      expect(result.allowed).toBe(true);
      expect(result.reasons).toHaveLength(0);
    });
  });

  describe("人数が不足しているとき", () => {
    it("確定を許可しない", () => {
      const result = canConfirm({
        game: createGame(),
        rsvps: Array.from({ length: 5 }, (_, i) => createRsvp(`m-${i + 1}`)),
        helperRequests: [],
        negotiations: [createNegotiation()],
        hasGround: true,
      });
      expect(result.allowed).toBe(false);
      expect(result.reasons).toContainEqual(
        expect.stringContaining("参加可能人数が不足"),
      );
    });
  });

  describe("対戦相手がいないとき", () => {
    it("確定を許可しない", () => {
      const result = canConfirm({
        game: createGame(),
        rsvps: Array.from({ length: 9 }, (_, i) => createRsvp(`m-${i + 1}`)),
        helperRequests: [],
        negotiations: [createNegotiation({ status: "SENT" })],
        hasGround: true,
      });
      expect(result.allowed).toBe(false);
      expect(result.reasons).toContainEqual(
        expect.stringContaining("承諾済みの対戦相手がいません"),
      );
    });
  });

  describe("練習のとき", () => {
    it("対戦相手なしでも確定を許可する", () => {
      const result = canConfirm({
        game: createGame({ game_type: "PRACTICE" }),
        rsvps: Array.from({ length: 9 }, (_, i) => createRsvp(`m-${i + 1}`)),
        helperRequests: [],
        negotiations: [],
        hasGround: true,
      });
      expect(result.allowed).toBe(true);
    });
  });

  describe("グラウンドが未確保のとき", () => {
    it("確定を許可しない", () => {
      const result = canConfirm({
        game: createGame({ ground_id: null, ground_name: null }),
        rsvps: Array.from({ length: 9 }, (_, i) => createRsvp(`m-${i + 1}`)),
        helperRequests: [],
        negotiations: [createNegotiation()],
        hasGround: false,
      });
      expect(result.allowed).toBe(false);
      expect(result.reasons).toContainEqual(
        expect.stringContaining("グラウンドが未確保"),
      );
    });
  });

  describe("ground_nameが手入力されているとき", () => {
    it("hasGround=falseでも確定を許可する", () => {
      const result = canConfirm({
        game: createGame({ ground_id: null, ground_name: "テスト球場" }),
        rsvps: Array.from({ length: 9 }, (_, i) => createRsvp(`m-${i + 1}`)),
        helperRequests: [],
        negotiations: [createNegotiation()],
        hasGround: false,
      });
      expect(result.allowed).toBe(true);
    });
  });
});

// --- checkHelperFulfillment ---

describe("checkHelperFulfillment", () => {
  describe("人数が充足したとき", () => {
    it("PENDINGの打診をキャンセル対象にする", () => {
      const result = checkHelperFulfillment({
        game: createGame({ min_players: 9 }),
        availableMembers: 7,
        helperRequests: [
          createHelperRequest({ id: "hr-1", status: "ACCEPTED" }),
          createHelperRequest({ id: "hr-2", status: "ACCEPTED" }),
          createHelperRequest({ id: "hr-3", status: "PENDING" }),
        ],
      });
      expect(result.fulfilled).toBe(true);
      expect(result.totalAvailable).toBe(9);
      expect(result.toCancel).toEqual(["hr-3"]);
    });
  });

  describe("人数が不足しているとき", () => {
    it("キャンセル対象は空", () => {
      const result = checkHelperFulfillment({
        game: createGame({ min_players: 9 }),
        availableMembers: 5,
        helperRequests: [
          createHelperRequest({ id: "hr-1", status: "ACCEPTED" }),
          createHelperRequest({ id: "hr-2", status: "PENDING" }),
        ],
      });
      expect(result.fulfilled).toBe(false);
      expect(result.toCancel).toEqual([]);
    });
  });
});

// --- checkStopConditions ---

describe("checkStopConditions", () => {
  describe("試合日が設定されていないとき", () => {
    it("警告を返す", () => {
      const warnings = checkStopConditions({
        game: createGame({ game_date: null }),
        negotiations: [],
      });
      expect(warnings).toContainEqual(
        expect.stringContaining("試合日が設定されていません"),
      );
    });
  });

  describe("すべての交渉が不成立のとき", () => {
    it("警告を返す", () => {
      const warnings = checkStopConditions({
        game: createGame(),
        negotiations: [
          createNegotiation({ status: "DECLINED" }),
          createNegotiation({ id: "neg-2", status: "CANCELLED" }),
        ],
      });
      expect(warnings).toContainEqual(
        expect.stringContaining("すべての交渉が不成立"),
      );
    });
  });

  describe("条件が正常なとき", () => {
    it("空配列を返す", () => {
      const warnings = checkStopConditions({
        game: createGame(),
        negotiations: [createNegotiation()],
      });
      expect(warnings).toHaveLength(0);
    });
  });
});
