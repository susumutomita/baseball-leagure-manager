import { describe, expect, it } from "bun:test";
import {
  createGameSchema,
  createHelperRequestsSchema,
  createHelperSchema,
  createTeamSchema,
  respondRsvpSchema,
  transitionGameSchema,
  zodToValidationError,
} from "../lib/validators";

describe("createGameSchema", () => {
  it("\u6b63\u3057\u3044\u5165\u529b\u3092\u53d7\u3051\u5165\u308c\u308b", () => {
    const result = createGameSchema.safeParse({
      team_id: "550e8400-e29b-41d4-a716-446655440000",
      title: "4/5 vs \u30c6\u30b9\u30c8\u30c1\u30fc\u30e0",
    });
    expect(result.success).toBe(true);
  });

  it("team_id\u304cUUID\u3067\u306a\u3044\u3068\u304d\u62d2\u5426\u3059\u308b", () => {
    const result = createGameSchema.safeParse({
      team_id: "not-a-uuid",
      title: "\u30c6\u30b9\u30c8",
    });
    expect(result.success).toBe(false);
  });

  it("title\u304c\u7a7a\u306e\u3068\u304d\u62d2\u5426\u3059\u308b", () => {
    const result = createGameSchema.safeParse({
      team_id: "550e8400-e29b-41d4-a716-446655440000",
      title: "",
    });
    expect(result.success).toBe(false);
  });

  it("\u30c7\u30d5\u30a9\u30eb\u30c8\u5024\u3092\u9069\u7528\u3059\u308b", () => {
    const result = createGameSchema.safeParse({
      team_id: "550e8400-e29b-41d4-a716-446655440000",
      title: "\u30c6\u30b9\u30c8",
    });
    if (result.success) {
      expect(result.data.game_type).toBe("FRIENDLY");
      expect(result.data.min_players).toBe(9);
    }
  });

  it("min_players\u304c0\u4ee5\u4e0b\u306e\u3068\u304d\u62d2\u5426\u3059\u308b", () => {
    const result = createGameSchema.safeParse({
      team_id: "550e8400-e29b-41d4-a716-446655440000",
      title: "\u30c6\u30b9\u30c8",
      min_players: 0,
    });
    expect(result.success).toBe(false);
  });
});

describe("transitionGameSchema", () => {
  it("\u6b63\u3057\u3044\u72b6\u614b\u9077\u79fb\u3092\u53d7\u3051\u5165\u308c\u308b", () => {
    const result = transitionGameSchema.safeParse({
      status: "COLLECTING",
    });
    expect(result.success).toBe(true);
  });

  it("\u4e0d\u6b63\u306a\u72b6\u614b\u3092\u62d2\u5426\u3059\u308b", () => {
    const result = transitionGameSchema.safeParse({
      status: "INVALID",
    });
    expect(result.success).toBe(false);
  });
});

describe("respondRsvpSchema", () => {
  it("AVAILABLE\u3092\u53d7\u3051\u5165\u308c\u308b", () => {
    const result = respondRsvpSchema.safeParse({
      response: "AVAILABLE",
    });
    expect(result.success).toBe(true);
  });

  it("NO_RESPONSE\u3092\u62d2\u5426\u3059\u308b", () => {
    const result = respondRsvpSchema.safeParse({
      response: "NO_RESPONSE",
    });
    expect(result.success).toBe(false);
  });
});

describe("createHelperSchema", () => {
  it("\u6b63\u3057\u3044\u5165\u529b\u3092\u53d7\u3051\u5165\u308c\u308b", () => {
    const result = createHelperSchema.safeParse({
      team_id: "550e8400-e29b-41d4-a716-446655440000",
      name: "\u7530\u4e2d\u592a\u90ce",
    });
    expect(result.success).toBe(true);
  });

  it("\u540d\u524d\u304c\u7a7a\u306e\u3068\u304d\u62d2\u5426\u3059\u308b", () => {
    const result = createHelperSchema.safeParse({
      team_id: "550e8400-e29b-41d4-a716-446655440000",
      name: "",
    });
    expect(result.success).toBe(false);
  });
});

describe("createHelperRequestsSchema", () => {
  it("\u6b63\u3057\u3044\u5165\u529b\u3092\u53d7\u3051\u5165\u308c\u308b", () => {
    const result = createHelperRequestsSchema.safeParse({
      helper_ids: ["550e8400-e29b-41d4-a716-446655440000"],
    });
    expect(result.success).toBe(true);
  });

  it("\u7a7a\u306e\u914d\u5217\u3092\u62d2\u5426\u3059\u308b", () => {
    const result = createHelperRequestsSchema.safeParse({
      helper_ids: [],
    });
    expect(result.success).toBe(false);
  });
});

describe("createTeamSchema", () => {
  it("\u6b63\u3057\u3044\u5165\u529b\u3092\u53d7\u3051\u5165\u308c\u308b", () => {
    const result = createTeamSchema.safeParse({
      name: "\u30c6\u30b9\u30c8\u30c1\u30fc\u30e0",
      home_area: "\u6a2a\u6d5c\u5e02",
    });
    expect(result.success).toBe(true);
  });
});

describe("createGameSchema — クロスフィールドバリデーション", () => {
  it("start_timeがend_timeより後のとき拒否する", () => {
    const result = createGameSchema.safeParse({
      team_id: "550e8400-e29b-41d4-a716-446655440000",
      title: "テスト",
      start_time: "14:00",
      end_time: "09:00",
    });
    expect(result.success).toBe(false);
  });

  it("start_timeがend_timeより前のとき受け入れる", () => {
    const result = createGameSchema.safeParse({
      team_id: "550e8400-e29b-41d4-a716-446655440000",
      title: "テスト",
      start_time: "09:00",
      end_time: "14:00",
    });
    expect(result.success).toBe(true);
  });

  it("start_timeとend_timeが同じとき拒否する", () => {
    const result = createGameSchema.safeParse({
      team_id: "550e8400-e29b-41d4-a716-446655440000",
      title: "テスト",
      start_time: "09:00",
      end_time: "09:00",
    });
    expect(result.success).toBe(false);
  });

  it("rsvp_deadlineがgame_dateより後のとき拒否する", () => {
    const result = createGameSchema.safeParse({
      team_id: "550e8400-e29b-41d4-a716-446655440000",
      title: "テスト",
      game_date: "2026-05-01",
      rsvp_deadline: "2026-05-02T00:00:00Z",
    });
    expect(result.success).toBe(false);
  });

  it("rsvp_deadlineがgame_dateより前のとき受け入れる", () => {
    const result = createGameSchema.safeParse({
      team_id: "550e8400-e29b-41d4-a716-446655440000",
      title: "テスト",
      game_date: "2026-05-01",
      rsvp_deadline: "2026-04-28T00:00:00Z",
    });
    expect(result.success).toBe(true);
  });

  it("片方のみ指定されている場合はクロスバリデーションをスキップする", () => {
    const result = createGameSchema.safeParse({
      team_id: "550e8400-e29b-41d4-a716-446655440000",
      title: "テスト",
      start_time: "09:00",
      end_time: null,
    });
    expect(result.success).toBe(true);
  });

  it("時刻がHH:MM形式でないとき拒否する", () => {
    const result = createGameSchema.safeParse({
      team_id: "550e8400-e29b-41d4-a716-446655440000",
      title: "テスト",
      start_time: "9:00",
    });
    expect(result.success).toBe(false);
  });
});

describe("zodToValidationError", () => {
  it("ZodError\u3092ValidationErr\u306b\u5909\u63db\u3059\u308b", () => {
    const result = createGameSchema.safeParse({ team_id: "bad", title: "" });
    if (!result.success) {
      const appError = zodToValidationError(result.error);
      expect(appError.type).toBe("VALIDATION_ERROR");
      expect(appError.issues.length).toBeGreaterThan(0);
    }
  });
});
