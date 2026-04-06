import { describe, expect, it } from "vitest";
import {
  buildGameConfirmedEmail,
  buildRsvpReminderEmail,
  buildSettlementRequestEmail,
} from "../lib/email-service";
import {
  buildGameConfirmedMessage,
  buildRsvpReminderFlex,
  buildRsvpReminderMessage,
  buildSettlementRequestMessage,
} from "../lib/line-messaging";
import type {
  GameConfirmedContext,
  RsvpReminderContext,
  SettlementRequestContext,
} from "../lib/line-messaging";
import { resolveChannels } from "../lib/notification-dispatcher";
import type { MemberNotificationPreference } from "../lib/notification-dispatcher";

// --- ファクトリ関数 ---

function createMemberPref(
  overrides: Partial<MemberNotificationPreference> = {},
): MemberNotificationPreference {
  return {
    memberId: "11111111-1111-1111-1111-111111111111",
    lineUserId: "U1234567890",
    email: "test@example.com",
    preferredChannels: ["LINE"],
    ...overrides,
  };
}

function createRsvpReminderContext(
  overrides: Partial<RsvpReminderContext> = {},
): RsvpReminderContext {
  return {
    teamName: "テストチーム",
    gameTitle: "練習試合 vs サンプルズ",
    gameDate: "2026-04-10",
    deadline: "2026-04-08 18:00",
    rsvpUrl: "https://mound.app/rsvp/123",
    ...overrides,
  };
}

function createGameConfirmedContext(
  overrides: Partial<GameConfirmedContext> = {},
): GameConfirmedContext {
  return {
    teamName: "テストチーム",
    gameTitle: "リーグ戦 第3節",
    gameDate: "2026-04-15",
    startTime: "10:00",
    groundName: "中央公園グラウンド",
    detailUrl: "https://mound.app/games/456",
    ...overrides,
  };
}

function createSettlementContext(
  overrides: Partial<SettlementRequestContext> = {},
): SettlementRequestContext {
  return {
    teamName: "テストチーム",
    gameTitle: "練習試合",
    amount: 1500,
    paypayLink: "https://pay.paypay.ne.jp/request?amount=1500",
    detailUrl: "https://mound.app/games/789/settlement",
    ...overrides,
  };
}

// ============================================================
// resolveChannels
// ============================================================

describe("resolveChannels", () => {
  describe("LINE IDとメールの両方があるとき", () => {
    it("希望チャネルに基づいて両方を返す", () => {
      const pref = createMemberPref({ preferredChannels: ["LINE", "EMAIL"] });
      const channels = resolveChannels(pref);

      expect(channels).toContain("LINE");
      expect(channels).toContain("EMAIL");
    });
  });

  describe("LINE IDのみがあるとき", () => {
    it("LINEチャネルのみを返す", () => {
      const pref = createMemberPref({
        email: null,
        preferredChannels: ["LINE"],
      });
      const channels = resolveChannels(pref);

      expect(channels).toEqual(["LINE"]);
    });
  });

  describe("メールのみがあるとき", () => {
    it("EMAILチャネルのみを返す", () => {
      const pref = createMemberPref({
        lineUserId: null,
        preferredChannels: ["EMAIL"],
      });
      const channels = resolveChannels(pref);

      expect(channels).toEqual(["EMAIL"]);
    });
  });

  describe("希望チャネルがLINEだがLINE IDがないとき", () => {
    it("フォールバックでEMAILを使う", () => {
      const pref = createMemberPref({
        lineUserId: null,
        email: "test@example.com",
        preferredChannels: ["LINE"],
      });
      const channels = resolveChannels(pref);

      expect(channels).toEqual(["EMAIL"]);
    });
  });

  describe("LINE IDもメールもないとき", () => {
    it("空の配列を返す", () => {
      const pref = createMemberPref({
        lineUserId: null,
        email: null,
        preferredChannels: ["LINE"],
      });
      const channels = resolveChannels(pref);

      expect(channels).toEqual([]);
    });
  });

  describe("希望チャネルがEMAILだがメールがないとき", () => {
    it("フォールバックでLINEを使う", () => {
      const pref = createMemberPref({
        lineUserId: "U12345",
        email: null,
        preferredChannels: ["EMAIL"],
      });
      const channels = resolveChannels(pref);

      expect(channels).toEqual(["LINE"]);
    });
  });
});

// ============================================================
// LINE メッセージテンプレート
// ============================================================

describe("LINE メッセージテンプレート", () => {
  describe("出欠リマインドメッセージを生成するとき", () => {
    it("チーム名と試合タイトルを含む通知テキストを返す", () => {
      const ctx = createRsvpReminderContext();
      const msg = buildRsvpReminderMessage(ctx);

      expect(msg.type).toBe("text");
      expect(msg.text).toContain("テストチーム");
      expect(msg.text).toContain("練習試合 vs サンプルズ");
      expect(msg.text).toContain("出欠確認");
    });

    it("日程と締切を含める", () => {
      const ctx = createRsvpReminderContext();
      const msg = buildRsvpReminderMessage(ctx);

      expect(msg.text).toContain("2026-04-10");
      expect(msg.text).toContain("2026-04-08 18:00");
    });

    it("回答URLを含める", () => {
      const ctx = createRsvpReminderContext();
      const msg = buildRsvpReminderMessage(ctx);

      expect(msg.text).toContain("https://mound.app/rsvp/123");
    });

    it("日程がnullのとき日程行を省略する", () => {
      const ctx = createRsvpReminderContext({ gameDate: null });
      const msg = buildRsvpReminderMessage(ctx);

      expect(msg.text).not.toContain("日程:");
    });

    it("締切がnullのとき締切行を省略する", () => {
      const ctx = createRsvpReminderContext({ deadline: null });
      const msg = buildRsvpReminderMessage(ctx);

      expect(msg.text).not.toContain("締切:");
    });
  });

  describe("出欠リマインド Flex メッセージを生成するとき", () => {
    it("Flexメッセージ型を返す", () => {
      const ctx = createRsvpReminderContext();
      const msg = buildRsvpReminderFlex(ctx);

      expect(msg.type).toBe("flex");
      expect(msg.altText).toContain("出欠確認");
      expect(msg.contents.type).toBe("bubble");
    });

    it("headerとfooterを含む", () => {
      const ctx = createRsvpReminderContext();
      const msg = buildRsvpReminderFlex(ctx);

      expect(msg.contents.header).toBeDefined();
      expect(msg.contents.footer).toBeDefined();
    });
  });

  describe("試合確定通知メッセージを生成するとき", () => {
    it("確定情報を含む通知テキストを返す", () => {
      const ctx = createGameConfirmedContext();
      const msg = buildGameConfirmedMessage(ctx);

      expect(msg.text).toContain("試合確定");
      expect(msg.text).toContain("リーグ戦 第3節");
      expect(msg.text).toContain("中央公園グラウンド");
    });

    it("会場がnullのとき会場行を省略する", () => {
      const ctx = createGameConfirmedContext({ groundName: null });
      const msg = buildGameConfirmedMessage(ctx);

      expect(msg.text).not.toContain("会場:");
    });

    it("開始時刻がnullのとき開始行を省略する", () => {
      const ctx = createGameConfirmedContext({ startTime: null });
      const msg = buildGameConfirmedMessage(ctx);

      expect(msg.text).not.toContain("開始:");
    });
  });

  describe("精算依頼メッセージを生成するとき", () => {
    it("金額とPayPayリンクを含む通知テキストを返す", () => {
      const ctx = createSettlementContext();
      const msg = buildSettlementRequestMessage(ctx);

      expect(msg.text).toContain("精算");
      expect(msg.text).toContain("1,500");
      expect(msg.text).toContain("PayPay");
    });

    it("PayPayリンクがnullのときPayPay行を省略する", () => {
      const ctx = createSettlementContext({ paypayLink: null });
      const msg = buildSettlementRequestMessage(ctx);

      expect(msg.text).not.toContain("PayPay");
    });
  });
});

// ============================================================
// Email テンプレート
// ============================================================

describe("Email テンプレート", () => {
  describe("出欠リマインドメールを生成するとき", () => {
    it("件名にチーム名と試合タイトルを含める", () => {
      const email = buildRsvpReminderEmail({
        teamName: "テストチーム",
        gameTitle: "練習試合",
        gameDate: "2026-04-10",
        deadline: null,
        rsvpUrl: "https://mound.app/rsvp/123",
      });

      expect(email.subject).toContain("テストチーム");
      expect(email.subject).toContain("練習試合");
      expect(email.subject).toContain("出欠確認");
    });

    it("HTML本文に回答リンクを含める", () => {
      const email = buildRsvpReminderEmail({
        teamName: "テストチーム",
        gameTitle: "練習試合",
        gameDate: null,
        deadline: null,
        rsvpUrl: "https://mound.app/rsvp/123",
      });

      expect(email.html).toContain("https://mound.app/rsvp/123");
    });

    it("締切がある場合はHTMLに含める", () => {
      const email = buildRsvpReminderEmail({
        teamName: "テストチーム",
        gameTitle: "練習試合",
        gameDate: null,
        deadline: "2026-04-08",
        rsvpUrl: "https://mound.app/rsvp/123",
      });

      expect(email.html).toContain("2026-04-08");
    });
  });

  describe("試合確定メールを生成するとき", () => {
    it("件名に試合確定を含める", () => {
      const email = buildGameConfirmedEmail({
        teamName: "テストチーム",
        gameTitle: "リーグ戦",
        gameDate: "2026-04-15",
        startTime: "10:00",
        groundName: "中央公園",
        detailUrl: "https://mound.app/games/456",
      });

      expect(email.subject).toContain("試合確定");
    });

    it("HTML本文に会場情報を含める", () => {
      const email = buildGameConfirmedEmail({
        teamName: "テストチーム",
        gameTitle: "リーグ戦",
        gameDate: "2026-04-15",
        startTime: "10:00",
        groundName: "中央公園",
        detailUrl: "https://mound.app/games/456",
      });

      expect(email.html).toContain("中央公園");
    });
  });

  describe("精算依頼メールを生成するとき", () => {
    it("HTML本文に金額を含める", () => {
      const email = buildSettlementRequestEmail({
        teamName: "テストチーム",
        gameTitle: "練習試合",
        amount: 2000,
        paypayLink: null,
        detailUrl: "https://mound.app/games/789",
      });

      expect(email.html).toContain("2,000");
    });

    it("件名に精算を含める", () => {
      const email = buildSettlementRequestEmail({
        teamName: "テストチーム",
        gameTitle: "練習試合",
        amount: 2000,
        paypayLink: null,
        detailUrl: "https://mound.app/games/789",
      });

      expect(email.subject).toContain("精算");
    });

    it("PayPayリンクがある場合はHTMLに含める", () => {
      const email = buildSettlementRequestEmail({
        teamName: "テストチーム",
        gameTitle: "練習試合",
        amount: 1500,
        paypayLink: "https://pay.paypay.ne.jp/request?amount=1500",
        detailUrl: "https://mound.app/games/789",
      });

      expect(email.html).toContain("PayPay");
    });
  });
});
