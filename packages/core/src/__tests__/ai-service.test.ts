import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  generateNegotiationMessage,
  generateWeeklyReport,
  predictAttendance,
  recommendHelpers,
} from "../lib/ai-service";

// --- テストヘルパー ---

function createMemberInput(
  overrides: Partial<{
    name: string;
    attendance_rate: number;
    no_show_rate: number;
  }> = {},
) {
  return {
    name: "田中太郎",
    attendance_rate: 0.8,
    no_show_rate: 0.05,
    ...overrides,
  };
}

function createGameInput(
  overrides: Partial<{ game_date: string | null; game_type: string }> = {},
) {
  return {
    game_date: "2026-05-01",
    game_type: "FRIENDLY",
    ...overrides,
  };
}

function createHelperInput(
  id: string,
  overrides: Partial<{
    name: string;
    reliability_score: number;
    times_helped: number;
  }> = {},
) {
  return {
    id,
    name: `助っ人${id}`,
    reliability_score: 0.8,
    times_helped: 3,
    ...overrides,
  };
}

function createWeeklyGameInput(
  overrides: Partial<{
    title: string;
    status: string;
    game_date: string | null;
    available_count: number;
    min_players: number;
  }> = {},
) {
  return {
    title: "練習試合 vs チームA",
    status: "COLLECTING",
    game_date: "2026-05-01",
    available_count: 7,
    min_players: 9,
    ...overrides,
  };
}

// --- テスト ---

describe("ai-service", () => {
  const originalEnv = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = undefined;
  });

  afterEach(() => {
    if (originalEnv) {
      process.env.ANTHROPIC_API_KEY = originalEnv;
    } else {
      process.env.ANTHROPIC_API_KEY = undefined;
    }
  });

  describe("predictAttendance", () => {
    describe("ANTHROPIC_API_KEY が未設定のとき", () => {
      it("フォールバック値を返す", async () => {
        const member = createMemberInput({ attendance_rate: 0.75 });
        const game = createGameInput();

        const result = await predictAttendance(member, game);

        expect(result.probability).toBe(0.75);
        expect(result.reasoning).toContain("過去の出席率");
      });
    });

    describe("出席率が0のメンバーのとき", () => {
      it("フォールバックで確率0を返す", async () => {
        const member = createMemberInput({ attendance_rate: 0 });
        const game = createGameInput();

        const result = await predictAttendance(member, game);

        expect(result.probability).toBe(0);
      });
    });

    describe("出席率が1.0のメンバーのとき", () => {
      it("フォールバックで確率1.0を返す", async () => {
        const member = createMemberInput({ attendance_rate: 1.0 });
        const game = createGameInput();

        const result = await predictAttendance(member, game);

        expect(result.probability).toBe(1.0);
      });
    });
  });

  describe("recommendHelpers", () => {
    describe("ANTHROPIC_API_KEY が未設定のとき", () => {
      it("信頼度スコア順のフォールバックを返す", async () => {
        const helpers = [
          createHelperInput("h1", {
            reliability_score: 0.6,
            times_helped: 2,
          }),
          createHelperInput("h2", {
            reliability_score: 0.9,
            times_helped: 5,
          }),
          createHelperInput("h3", {
            reliability_score: 0.7,
            times_helped: 1,
          }),
        ];

        const result = await recommendHelpers(helpers, 2);

        expect(result).toHaveLength(2);
        expect(result[0].helper_id).toBe("h2");
        expect(result[1].helper_id).toBe("h3");
      });
    });

    describe("必要人数が候補者数より多いとき", () => {
      it("全候補者を返す", async () => {
        const helpers = [createHelperInput("h1")];

        const result = await recommendHelpers(helpers, 3);

        expect(result).toHaveLength(1);
        expect(result[0].helper_id).toBe("h1");
      });
    });

    describe("候補者が空のとき", () => {
      it("空配列を返す", async () => {
        const result = await recommendHelpers([], 2);

        expect(result).toHaveLength(0);
      });
    });
  });

  describe("generateNegotiationMessage", () => {
    describe("ANTHROPIC_API_KEY が未設定のとき", () => {
      it("フォールバックメッセージを返す", async () => {
        const result = await generateNegotiationMessage({
          team_name: "サンダーズ",
          opponent_name: "イーグルス",
          proposed_dates: ["2026-05-01", "2026-05-08"],
          ground_name: "中央球場",
        });

        expect(result).toContain("サンダーズ");
        expect(result).toContain("イーグルス");
        expect(result).toContain("2026-05-01");
        expect(result).toContain("2026-05-08");
        expect(result).toContain("中央球場");
      });
    });

    describe("会場が未指定のとき", () => {
      it("会場なしのフォールバックメッセージを返す", async () => {
        const result = await generateNegotiationMessage({
          team_name: "サンダーズ",
          opponent_name: "イーグルス",
          proposed_dates: ["2026-05-01"],
        });

        expect(result).toContain("サンダーズ");
        expect(result).toContain("イーグルス");
        expect(result).not.toContain("会場");
      });
    });
  });

  describe("generateWeeklyReport", () => {
    describe("試合が0件のとき", () => {
      it("試合なしメッセージを返す", async () => {
        const result = await generateWeeklyReport([]);

        expect(result).toBe("今週の試合予定はありません。");
      });
    });

    describe("ANTHROPIC_API_KEY が未設定のとき", () => {
      it("フォールバックレポートを返す", async () => {
        const games = [
          createWeeklyGameInput({
            title: "練習試合A",
            available_count: 7,
            min_players: 9,
          }),
          createWeeklyGameInput({
            title: "リーグ戦B",
            status: "CONFIRMED",
            available_count: 11,
            min_players: 9,
          }),
        ];

        const result = await generateWeeklyReport(games);

        expect(result).toContain("練習試合A");
        expect(result).toContain("リーグ戦B");
        expect(result).toContain("7/9");
        expect(result).toContain("11/9");
      });
    });
  });
});
