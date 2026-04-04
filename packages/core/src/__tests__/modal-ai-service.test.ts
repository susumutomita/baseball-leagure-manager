import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  generateNegotiationMessageModal,
  generateWeeklyReportModal,
  predictAttendanceModal,
  recommendHelpersModal,
} from "../lib/modal-ai-service";

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

function createNegotiationContext(
  overrides: Partial<{
    team_name: string;
    opponent_name: string;
    proposed_dates: string[];
    ground_name: string | undefined;
  }> = {},
) {
  return {
    team_name: "港北サンダース",
    opponent_name: "横浜ベアーズ",
    proposed_dates: ["2026-05-10", "2026-05-17"],
    ground_name: "新横浜公園グラウンドA",
    ...overrides,
  };
}

// --- テスト ---

describe("modal-ai-service", () => {
  const originalUrl = process.env.MODAL_API_URL;
  const originalKey = process.env.MODAL_API_KEY;

  beforeEach(() => {
    process.env.MODAL_API_URL = undefined;
    process.env.MODAL_API_KEY = undefined;
  });

  afterEach(() => {
    process.env.MODAL_API_URL = originalUrl;
    process.env.MODAL_API_KEY = originalKey;
  });

  describe("predictAttendanceModal", () => {
    describe("MODAL_API_URL が未設定のとき", () => {
      it("フォールバック値として過去の出席率を返す", async () => {
        const member = createMemberInput({ attendance_rate: 0.75 });
        const game = createGameInput();

        const result = await predictAttendanceModal(member, game);

        expect(result.probability).toBe(0.75);
        expect(result.reasoning).toContain("過去の出席率");
      });
    });

    describe("出席率が0のメンバーのとき", () => {
      it("フォールバックで確率0を返す", async () => {
        const member = createMemberInput({ attendance_rate: 0 });
        const game = createGameInput();

        const result = await predictAttendanceModal(member, game);

        expect(result.probability).toBe(0);
      });
    });

    describe("出席率が1.0のメンバーのとき", () => {
      it("フォールバックで確率1.0を返す", async () => {
        const member = createMemberInput({ attendance_rate: 1.0 });
        const game = createGameInput();

        const result = await predictAttendanceModal(member, game);

        expect(result.probability).toBe(1.0);
      });
    });
  });

  describe("recommendHelpersModal", () => {
    describe("MODAL_API_URL が未設定のとき", () => {
      it("信頼度スコア順にフォールバック推薦を返す", async () => {
        const helpers = [
          createHelperInput("h1", { reliability_score: 0.6 }),
          createHelperInput("h2", { reliability_score: 0.9 }),
          createHelperInput("h3", { reliability_score: 0.75 }),
        ];

        const result = await recommendHelpersModal(helpers, 2);

        expect(result).toHaveLength(2);
        expect(result[0].helper_id).toBe("h2");
        expect(result[1].helper_id).toBe("h3");
      });
    });

    describe("必要人数が候補者数以上のとき", () => {
      it("全候補者を返す", async () => {
        const helpers = [createHelperInput("h1"), createHelperInput("h2")];

        const result = await recommendHelpersModal(helpers, 5);

        expect(result).toHaveLength(2);
      });
    });

    describe("候補者が空のとき", () => {
      it("空配列を返す", async () => {
        const result = await recommendHelpersModal([], 3);

        expect(result).toHaveLength(0);
      });
    });
  });

  describe("generateNegotiationMessageModal", () => {
    describe("MODAL_API_URL が未設定のとき", () => {
      it("フォールバックメッセージを返す", async () => {
        const context = createNegotiationContext();

        const result = await generateNegotiationMessageModal(context);

        expect(result).toContain("港北サンダース");
        expect(result).toContain("横浜ベアーズ");
        expect(result).toContain("2026-05-10");
      });
    });

    describe("会場が未定のとき", () => {
      it("会場なしのフォールバックメッセージを返す", async () => {
        const context = createNegotiationContext({ ground_name: undefined });

        const result = await generateNegotiationMessageModal(context);

        expect(result).not.toContain("会場:");
      });
    });
  });

  describe("generateWeeklyReportModal", () => {
    describe("試合が0件のとき", () => {
      it("試合なしのメッセージを返す", async () => {
        const result = await generateWeeklyReportModal([]);

        expect(result).toBe("今週の試合予定はありません。");
      });
    });

    describe("MODAL_API_URL が未設定で試合があるとき", () => {
      it("フォールバックレポートを返す", async () => {
        const games = [
          createWeeklyGameInput({ title: "試合A", available_count: 10 }),
          createWeeklyGameInput({
            title: "試合B",
            available_count: 5,
            status: "ADJUSTING",
          }),
        ];

        const result = await generateWeeklyReportModal(games);

        expect(result).toContain("試合A");
        expect(result).toContain("試合B");
      });
    });
  });
});
