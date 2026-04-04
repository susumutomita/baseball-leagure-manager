import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  buildGameConfirmedMessage,
  buildRsvpReminderFlex,
  buildRsvpReminderMessage,
  buildSettlementRequestMessage,
  createLineSender,
  pushMessage,
} from "../lib/line-messaging";
import type {
  GameConfirmedContext,
  RsvpReminderContext,
  SettlementRequestContext,
} from "../lib/line-messaging";

// --- テストヘルパー ---

function createRsvpReminderContext(
  overrides: Partial<RsvpReminderContext> = {},
): RsvpReminderContext {
  return {
    teamName: "港北サンダース",
    gameTitle: "練習試合 vs 横浜ベアーズ",
    gameDate: "2026-05-01",
    deadline: "2026-04-28",
    rsvpUrl: "https://mound.app/rsvp/abc123",
    ...overrides,
  };
}

function createGameConfirmedContext(
  overrides: Partial<GameConfirmedContext> = {},
): GameConfirmedContext {
  return {
    teamName: "港北サンダース",
    gameTitle: "練習試合 vs 横浜ベアーズ",
    gameDate: "2026-05-01",
    startTime: "10:00",
    groundName: "新横浜公園グラウンドA",
    detailUrl: "https://mound.app/games/abc123",
    ...overrides,
  };
}

function createSettlementContext(
  overrides: Partial<SettlementRequestContext> = {},
): SettlementRequestContext {
  return {
    teamName: "港北サンダース",
    gameTitle: "練習試合 vs 横浜ベアーズ",
    amount: 1500,
    paypayLink: "https://paypay.ne.jp/abc",
    detailUrl: "https://mound.app/games/abc123",
    ...overrides,
  };
}

// --- テスト ---

describe("line-messaging", () => {
  describe("buildRsvpReminderMessage", () => {
    describe("すべての項目が設定されているとき", () => {
      it("チーム名・試合名・日程・締切・URLを含むメッセージを返す", () => {
        const ctx = createRsvpReminderContext();

        const result = buildRsvpReminderMessage(ctx);

        expect(result.type).toBe("text");
        expect(result.text).toContain("港北サンダース");
        expect(result.text).toContain("練習試合 vs 横浜ベアーズ");
        expect(result.text).toContain("2026-05-01");
        expect(result.text).toContain("2026-04-28");
        expect(result.text).toContain("https://mound.app/rsvp/abc123");
      });
    });

    describe("日程が未定のとき", () => {
      it("日程部分を含まないメッセージを返す", () => {
        const ctx = createRsvpReminderContext({ gameDate: null });

        const result = buildRsvpReminderMessage(ctx);

        expect(result.text).not.toContain("日程:");
      });
    });

    describe("締切が未設定のとき", () => {
      it("締切部分を含まないメッセージを返す", () => {
        const ctx = createRsvpReminderContext({ deadline: null });

        const result = buildRsvpReminderMessage(ctx);

        expect(result.text).not.toContain("締切:");
      });
    });
  });

  describe("buildRsvpReminderFlex", () => {
    describe("すべての項目が設定されているとき", () => {
      it("Flex メッセージを返す", () => {
        const ctx = createRsvpReminderContext();

        const result = buildRsvpReminderFlex(ctx);

        expect(result.type).toBe("flex");
        expect(result.altText).toContain("港北サンダース");
        expect(result.contents.type).toBe("bubble");
        expect(result.contents.footer).toBeDefined();
      });
    });

    describe("日程が未定のとき", () => {
      it("body に日程テキストを含まない", () => {
        const ctx = createRsvpReminderContext({ gameDate: null });

        const result = buildRsvpReminderFlex(ctx);

        const bodyTexts = result.contents.body.contents
          .filter((c) => c.type === "text")
          .map((c) => ("text" in c ? c.text : ""));
        const hasDateText = bodyTexts.some((t) => t.includes("日程:"));
        expect(hasDateText).toBe(false);
      });
    });
  });

  describe("buildGameConfirmedMessage", () => {
    describe("すべての項目が設定されているとき", () => {
      it("確定通知メッセージを返す", () => {
        const ctx = createGameConfirmedContext();

        const result = buildGameConfirmedMessage(ctx);

        expect(result.type).toBe("text");
        expect(result.text).toContain("試合確定");
        expect(result.text).toContain("2026-05-01");
        expect(result.text).toContain("10:00");
        expect(result.text).toContain("新横浜公園グラウンドA");
      });
    });

    describe("会場が未定のとき", () => {
      it("会場部分を含まないメッセージを返す", () => {
        const ctx = createGameConfirmedContext({ groundName: null });

        const result = buildGameConfirmedMessage(ctx);

        expect(result.text).not.toContain("会場:");
      });
    });
  });

  describe("buildSettlementRequestMessage", () => {
    describe("PayPayリンクがあるとき", () => {
      it("PayPayリンクを含む精算メッセージを返す", () => {
        const ctx = createSettlementContext();

        const result = buildSettlementRequestMessage(ctx);

        expect(result.type).toBe("text");
        expect(result.text).toContain("精算");
        expect(result.text).toContain("1,500");
        expect(result.text).toContain("https://paypay.ne.jp/abc");
      });
    });

    describe("PayPayリンクがないとき", () => {
      it("PayPay部分を含まない精算メッセージを返す", () => {
        const ctx = createSettlementContext({ paypayLink: null });

        const result = buildSettlementRequestMessage(ctx);

        expect(result.text).not.toContain("PayPay");
      });
    });
  });

  describe("pushMessage", () => {
    const originalToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;

    beforeEach(() => {
      process.env.LINE_CHANNEL_ACCESS_TOKEN = undefined;
    });

    afterEach(() => {
      process.env.LINE_CHANNEL_ACCESS_TOKEN = originalToken;
    });

    describe("LINE_CHANNEL_ACCESS_TOKEN が未設定のとき", () => {
      it("エラーを返す", async () => {
        const result = await pushMessage("user123", [
          { type: "text", text: "テスト" },
        ]);

        expect(result.success).toBe(false);
        expect(result.error).toContain("LINE_CHANNEL_ACCESS_TOKEN");
      });
    });
  });

  describe("createLineSender", () => {
    describe("トークンなしで送信したとき", () => {
      it("false を返す", async () => {
        const sender = createLineSender(undefined);

        // LINE_CHANNEL_ACCESS_TOKEN もない場合 pushMessage がエラーを返す
        const originalToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
        process.env.LINE_CHANNEL_ACCESS_TOKEN = undefined;

        const result = await sender("user123", "テストメッセージ");

        expect(result).toBe(false);

        process.env.LINE_CHANNEL_ACCESS_TOKEN = originalToken;
      });
    });
  });
});
