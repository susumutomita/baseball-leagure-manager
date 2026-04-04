import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  buildGameConfirmedEmail,
  buildRsvpReminderEmail,
  buildSettlementRequestEmail,
  createEmailSender,
  sendEmail,
} from "../lib/email-service";
import type {
  EmailGameConfirmedContext,
  EmailRsvpReminderContext,
  EmailSettlementRequestContext,
} from "../lib/email-service";

// --- テストヘルパー ---

function createRsvpReminderContext(
  overrides: Partial<EmailRsvpReminderContext> = {},
): EmailRsvpReminderContext {
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
  overrides: Partial<EmailGameConfirmedContext> = {},
): EmailGameConfirmedContext {
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
  overrides: Partial<EmailSettlementRequestContext> = {},
): EmailSettlementRequestContext {
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

describe("email-service", () => {
  describe("buildRsvpReminderEmail", () => {
    describe("すべての項目が設定されているとき", () => {
      it("件名とHTMLにチーム名・試合名を含むメールを返す", () => {
        const ctx = createRsvpReminderContext();

        const result = buildRsvpReminderEmail(ctx);

        expect(result.subject).toContain("港北サンダース");
        expect(result.subject).toContain("出欠確認");
        expect(result.html).toContain("練習試合 vs 横浜ベアーズ");
        expect(result.html).toContain("https://mound.app/rsvp/abc123");
      });
    });

    describe("日程が設定されているとき", () => {
      it("HTML に日程を含む", () => {
        const ctx = createRsvpReminderContext({ gameDate: "2026-05-01" });

        const result = buildRsvpReminderEmail(ctx);

        expect(result.html).toContain("2026-05-01");
      });
    });

    describe("日程が未定のとき", () => {
      it("HTML に日程を含まない", () => {
        const ctx = createRsvpReminderContext({ gameDate: null });

        const result = buildRsvpReminderEmail(ctx);

        expect(result.html).not.toContain("日程:");
      });
    });

    describe("締切が設定されているとき", () => {
      it("HTML に締切を赤色で含む", () => {
        const ctx = createRsvpReminderContext({ deadline: "2026-04-28" });

        const result = buildRsvpReminderEmail(ctx);

        expect(result.html).toContain("2026-04-28");
        expect(result.html).toContain("color: red");
      });
    });

    describe("締切が未設定のとき", () => {
      it("HTML に締切を含まない", () => {
        const ctx = createRsvpReminderContext({ deadline: null });

        const result = buildRsvpReminderEmail(ctx);

        expect(result.html).not.toContain("締切:");
      });
    });
  });

  describe("buildGameConfirmedEmail", () => {
    describe("すべての項目が設定されているとき", () => {
      it("確定通知メールを返す", () => {
        const ctx = createGameConfirmedContext();

        const result = buildGameConfirmedEmail(ctx);

        expect(result.subject).toContain("試合確定");
        expect(result.html).toContain("確定しました");
        expect(result.html).toContain("2026-05-01");
        expect(result.html).toContain("10:00");
        expect(result.html).toContain("新横浜公園グラウンドA");
      });
    });

    describe("会場が未定のとき", () => {
      it("HTML に会場を含まない", () => {
        const ctx = createGameConfirmedContext({ groundName: null });

        const result = buildGameConfirmedEmail(ctx);

        expect(result.html).not.toContain("会場:");
      });
    });

    describe("開始時間が未定のとき", () => {
      it("HTML に開始時間を含まない", () => {
        const ctx = createGameConfirmedContext({ startTime: null });

        const result = buildGameConfirmedEmail(ctx);

        expect(result.html).not.toContain("開始:");
      });
    });
  });

  describe("buildSettlementRequestEmail", () => {
    describe("PayPayリンクがあるとき", () => {
      it("PayPayボタンを含む精算メールを返す", () => {
        const ctx = createSettlementContext();

        const result = buildSettlementRequestEmail(ctx);

        expect(result.subject).toContain("精算");
        expect(result.html).toContain("1,500");
        expect(result.html).toContain("https://paypay.ne.jp/abc");
        expect(result.html).toContain("PayPay");
      });
    });

    describe("PayPayリンクがないとき", () => {
      it("PayPayボタンを含まない精算メールを返す", () => {
        const ctx = createSettlementContext({ paypayLink: null });

        const result = buildSettlementRequestEmail(ctx);

        expect(result.html).not.toContain("PayPay");
      });
    });

    describe("金額が0のとき", () => {
      it("金額0の精算メールを返す", () => {
        const ctx = createSettlementContext({ amount: 0 });

        const result = buildSettlementRequestEmail(ctx);

        expect(result.html).toContain("0");
      });
    });
  });

  describe("sendEmail", () => {
    const originalKey = process.env.RESEND_API_KEY;

    beforeEach(() => {
      process.env.RESEND_API_KEY = undefined;
    });

    afterEach(() => {
      process.env.RESEND_API_KEY = originalKey;
    });

    describe("RESEND_API_KEY が未設定のとき", () => {
      it("スタブとして成功を返す", async () => {
        const result = await sendEmail({
          to: "test@example.com",
          subject: "テスト件名",
          html: "<p>テスト本文</p>",
        });

        expect(result.success).toBe(true);
        expect(result.messageId).toBe("stub");
      });
    });
  });

  describe("createEmailSender", () => {
    const originalKey = process.env.RESEND_API_KEY;

    beforeEach(() => {
      process.env.RESEND_API_KEY = undefined;
    });

    afterEach(() => {
      process.env.RESEND_API_KEY = originalKey;
    });

    describe("スタブモードのとき", () => {
      it("true を返す", async () => {
        const sender = createEmailSender();

        const result = await sender("test@example.com", "テスト内容");

        expect(result).toBe(true);
      });
    });
  });
});
