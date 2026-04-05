import { describe, expect, it } from "bun:test";
import {
  checkDeadline,
  filterExpiredGames,
  shouldSendReminder,
} from "../lib/deadline";
import type { Game, Rsvp } from "../types/domain";

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

// --- checkDeadline ---

describe("checkDeadline", () => {
  describe("締切前のとき", () => {
    it("isPastDeadlineがfalseになる", () => {
      const now = new Date("2026-04-15T00:00:00Z");
      const result = checkDeadline(createGame(), [], now);
      expect(result.isPastDeadline).toBe(false);
      expect(result.remainingMs).toBeGreaterThan(0);
    });
  });

  describe("締切後のとき", () => {
    it("isPastDeadlineがtrueになる", () => {
      const now = new Date("2026-04-21T00:00:00Z");
      const result = checkDeadline(createGame(), [], now);
      expect(result.isPastDeadline).toBe(true);
      expect(result.remainingMs).toBeLessThan(0);
    });
  });

  describe("締切が設定されていないとき", () => {
    it("isPastDeadlineがfalseで残り時間は無限大", () => {
      const result = checkDeadline(
        createGame({ rsvp_deadline: null }),
        [],
        new Date(),
      );
      expect(result.isPastDeadline).toBe(false);
      expect(result.remainingMs).toBe(Number.POSITIVE_INFINITY);
    });
  });

  describe("未回答メンバーがいるとき", () => {
    it("未回答メンバーIDを返す", () => {
      const rsvps = [
        createRsvp("m-1", "AVAILABLE"),
        createRsvp("m-2", "NO_RESPONSE"),
        createRsvp("m-3", "NO_RESPONSE"),
      ];
      const result = checkDeadline(createGame(), rsvps, new Date());
      expect(result.noResponseMemberIds).toEqual(["m-2", "m-3"]);
    });
  });

  describe("回答率の計算", () => {
    it("全員回答済みのとき1.0を返す", () => {
      const rsvps = [
        createRsvp("m-1", "AVAILABLE"),
        createRsvp("m-2", "UNAVAILABLE"),
      ];
      const result = checkDeadline(createGame(), rsvps, new Date());
      expect(result.responseRate).toBe(1);
    });

    it("半分回答のとき0.5を返す", () => {
      const rsvps = [
        createRsvp("m-1", "AVAILABLE"),
        createRsvp("m-2", "NO_RESPONSE"),
      ];
      const result = checkDeadline(createGame(), rsvps, new Date());
      expect(result.responseRate).toBe(0.5);
    });

    it("RSVPが0件のとき0を返す", () => {
      const result = checkDeadline(createGame(), [], new Date());
      expect(result.responseRate).toBe(0);
    });
  });
});

// --- shouldSendReminder ---

describe("shouldSendReminder", () => {
  describe("締切24時間前で24時間リマインダーが設定されているとき", () => {
    it("リマインダーを送信すべき", () => {
      const now = new Date("2026-04-19T00:00:00Z"); // deadline: 2026-04-20T00:00:00Z
      const result = shouldSendReminder({
        game: createGame(),
        rsvps: [createRsvp("m-1", "NO_RESPONSE")],
        reminderHoursBefore: [24, 6],
        now,
      });
      expect(result.shouldSend).toBe(true);
      expect(result.hoursBeforeDeadline).toBe(24);
    });
  });

  describe("未回答者がいないとき", () => {
    it("リマインダー不要", () => {
      const result = shouldSendReminder({
        game: createGame(),
        rsvps: [createRsvp("m-1", "AVAILABLE")],
        reminderHoursBefore: [24],
        now: new Date("2026-04-19T00:00:00Z"),
      });
      expect(result.shouldSend).toBe(false);
    });
  });

  describe("締切を過ぎているとき", () => {
    it("リマインダー不要", () => {
      const result = shouldSendReminder({
        game: createGame(),
        rsvps: [createRsvp("m-1", "NO_RESPONSE")],
        reminderHoursBefore: [24],
        now: new Date("2026-04-21T00:00:00Z"),
      });
      expect(result.shouldSend).toBe(false);
    });
  });

  describe("リマインダー時間に該当しないとき", () => {
    it("リマインダー不要", () => {
      const now = new Date("2026-04-18T00:00:00Z"); // 48時間前
      const result = shouldSendReminder({
        game: createGame(),
        rsvps: [createRsvp("m-1", "NO_RESPONSE")],
        reminderHoursBefore: [24, 6],
        now,
      });
      expect(result.shouldSend).toBe(false);
    });
  });

  describe("締切が設定されていないとき", () => {
    it("リマインダー不要", () => {
      const result = shouldSendReminder({
        game: createGame({ rsvp_deadline: null }),
        rsvps: [createRsvp("m-1", "NO_RESPONSE")],
        reminderHoursBefore: [24],
      });
      expect(result.shouldSend).toBe(false);
    });
  });
});

// --- filterExpiredGames ---

describe("filterExpiredGames", () => {
  describe("締切超過の試合があるとき", () => {
    it("該当する試合のみ返す", () => {
      const games = [
        createGame({ id: "expired", rsvp_deadline: "2026-04-01T00:00:00Z" }),
        createGame({ id: "active", rsvp_deadline: "2026-06-01T00:00:00Z" }),
        createGame({
          id: "no-deadline",
          rsvp_deadline: null,
        }),
      ];
      const now = new Date("2026-04-15T00:00:00Z");
      const result = filterExpiredGames(games, now);
      expect(result).toHaveLength(1);
      expect(result[0]?.id).toBe("expired");
    });
  });

  describe("COLLECTINGステータス以外の場合", () => {
    it("対象外にする", () => {
      const games = [
        createGame({
          id: "confirmed",
          status: "CONFIRMED",
          rsvp_deadline: "2026-04-01T00:00:00Z",
        }),
      ];
      const now = new Date("2026-04-15T00:00:00Z");
      const result = filterExpiredGames(games, now);
      expect(result).toHaveLength(0);
    });
  });
});
