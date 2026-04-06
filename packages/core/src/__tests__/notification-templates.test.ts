import { describe, expect, it } from "vitest";
import {
  buildDeadlineWarningMessage,
  buildGameCancelledMessage,
  buildGameConfirmedMessage,
  buildRsvpReminderMessage,
  buildRsvpRequestMessage,
  buildSettlementMessage,
} from "../lib/notification-templates";
import type { Game } from "../types/domain";

function createGame(overrides: Partial<Game> = {}): Game {
  return {
    id: "game-1",
    team_id: "team-1",
    title: "春季リーグ第1節",
    game_type: "FRIENDLY",
    status: "COLLECTING",
    game_date: "2026-05-01",
    start_time: "09:00",
    end_time: "12:00",
    ground_id: null,
    ground_name: "横浜スタジアム第三球場",
    opponent_team_id: null,
    min_players: 9,
    rsvp_deadline: "2026-04-28T18:00:00Z",
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

describe("buildRsvpRequestMessage", () => {
  it("出欠依頼メッセージを生成する", () => {
    const msg = buildRsvpRequestMessage(
      createGame(),
      "テストチーム",
      "https://mound.app/rsvp/game-1",
    );
    expect(msg).toContain("【出欠確認】テストチーム");
    expect(msg).toContain("春季リーグ第1節");
    expect(msg).toContain("2026-05-01");
    expect(msg).toContain("09:00");
    expect(msg).toContain("横浜スタジアム第三球場");
    expect(msg).toContain("https://mound.app/rsvp/game-1");
  });

  it("日程未定のとき「日程未定」と表示する", () => {
    const msg = buildRsvpRequestMessage(
      createGame({ game_date: null }),
      "テストチーム",
      "https://mound.app/rsvp/game-1",
    );
    expect(msg).toContain("日程未定");
  });
});

describe("buildRsvpReminderMessage", () => {
  it("リマインダーメッセージを生成する", () => {
    const msg = buildRsvpReminderMessage(
      createGame(),
      "テストチーム",
      5,
      "https://mound.app/rsvp/game-1",
    );
    expect(msg).toContain("【リマインダー】");
    expect(msg).toContain("5人が未回答");
  });
});

describe("buildGameConfirmedMessage", () => {
  it("試合確定メッセージを生成する", () => {
    const msg = buildGameConfirmedMessage(createGame(), "テストチーム", 12);
    expect(msg).toContain("【試合確定】");
    expect(msg).toContain("12人");
    expect(msg).toContain("09:00〜12:00");
  });
});

describe("buildGameCancelledMessage", () => {
  it("試合中止メッセージを生成する", () => {
    const msg = buildGameCancelledMessage(
      createGame(),
      "テストチーム",
      "雨天のため",
    );
    expect(msg).toContain("【試合中止】");
    expect(msg).toContain("雨天のため");
  });

  it("理由なしでもメッセージを生成する", () => {
    const msg = buildGameCancelledMessage(createGame(), "テストチーム");
    expect(msg).toContain("【試合中止】");
    expect(msg).not.toContain("理由:");
  });
});

describe("buildSettlementMessage", () => {
  it("精算メッセージを生成する", () => {
    const msg = buildSettlementMessage(
      createGame(),
      { per_member: 800, team_cost: 8000 },
      "https://pay.paypay.ne.jp/xxx",
    );
    expect(msg).toContain("【精算のお知らせ】");
    expect(msg).toContain("800");
    expect(msg).toContain("8,000");
    expect(msg).toContain("https://pay.paypay.ne.jp/xxx");
  });

  it("支払いURL無しでも生成する", () => {
    const msg = buildSettlementMessage(createGame(), {
      per_member: 500,
      team_cost: 5000,
    });
    expect(msg).toContain("500");
    expect(msg).not.toContain("お支払いはこちら");
  });
});

describe("buildDeadlineWarningMessage", () => {
  it("24時間以上のとき日数で表示する", () => {
    const msg = buildDeadlineWarningMessage(createGame(), 48, 3);
    expect(msg).toContain("2日");
    expect(msg).toContain("3人");
  });

  it("24時間未満のとき時間で表示する", () => {
    const msg = buildDeadlineWarningMessage(createGame(), 12, 5);
    expect(msg).toContain("12時間");
    expect(msg).toContain("5人");
  });
});
