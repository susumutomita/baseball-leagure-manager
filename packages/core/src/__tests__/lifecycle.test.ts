import { describe, expect, it } from "vitest";
import {
  assertTransition,
  calculateSettlement,
  canConfirm,
  canTransition,
  canTransitionWithContext,
  checkHelperFulfillment,
  checkStopConditions,
  suggestNextActions,
} from "../index";
import type { Game, HelperRequest, Negotiation, Rsvp } from "../types/domain";

/**
 * 統合テスト: ゲームライフサイクル全体のフロー
 *
 * DRAFT → COLLECTING → CONFIRMED → COMPLETED → SETTLED
 * の各ステージでの状態遷移・ガバナー・精算を検証する
 */

// --- テストヘルパー ---

function createGame(overrides: Partial<Game> = {}): Game {
  return {
    id: "game-1",
    team_id: "team-1",
    title: "春季リーグ第1節",
    game_type: "FRIENDLY",
    status: "DRAFT",
    game_date: "2026-05-01",
    start_time: "09:00",
    end_time: "12:00",
    ground_id: "ground-1",
    ground_name: "横浜スタジアム第三球場",
    opponent_team_id: null,
    min_players: 9,
    rsvp_deadline: "2026-04-25T00:00:00Z",
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
    sent_at: "2026-04-01T00:00:00Z",
    replied_at: "2026-04-02T00:00:00Z",
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
    sent_at: "2026-04-01T00:00:00Z",
    responded_at: "2026-04-02T00:00:00Z",
    cancelled_at: null,
    cancel_reason: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// --- 統合テスト ---

describe("ゲームライフサイクル統合テスト", () => {
  describe("正常系: DRAFT → COLLECTING → CONFIRMED → COMPLETED → SETTLED", () => {
    it("全ステージを正常に遷移できる", () => {
      // Stage 1: DRAFT → COLLECTING
      const draftGame = createGame({ status: "DRAFT" });
      expect(canTransition("DRAFT", "COLLECTING")).toBe(true);
      assertTransition("DRAFT", "COLLECTING");

      // DRAFT のネクストアクション確認
      const draftActions = suggestNextActions({ game: draftGame });
      expect(draftActions.length).toBeGreaterThan(0);

      // Stage 2: COLLECTING → CONFIRMED (ガバナーチェック)
      const collectingGame = createGame({ status: "COLLECTING" });
      const rsvps = Array.from({ length: 10 }, (_, i) =>
        createRsvp(`m-${i + 1}`),
      );
      const negotiation = createNegotiation({ status: "ACCEPTED" });

      const governorResult = canConfirm({
        game: collectingGame,
        rsvps,
        helperRequests: [],
        negotiations: [negotiation],
        hasGround: true,
      });
      expect(governorResult.allowed).toBe(true);
      assertTransition("COLLECTING", "CONFIRMED");

      // Stage 3: CONFIRMED → COMPLETED (試合日が過ぎた後)
      const confirmedGame = createGame({
        status: "CONFIRMED",
        game_date: "2020-01-01", // 過去日
      });
      const completionCheck = canTransitionWithContext(
        "CONFIRMED",
        "COMPLETED",
        { gameDate: confirmedGame.game_date },
      );
      expect(completionCheck.allowed).toBe(true);
      assertTransition("CONFIRMED", "COMPLETED");

      // Stage 4: COMPLETED → SETTLED (精算)
      const settlement = calculateSettlement({
        expenses: [
          { amount: 6000, split_with_opponent: true },
          { amount: 2000, split_with_opponent: false },
        ],
        memberCount: 10,
      });
      expect(settlement.totalCost).toBe(8000);
      expect(settlement.opponentShare).toBe(3000);
      expect(settlement.teamCost).toBe(5000);
      expect(settlement.perMember).toBe(500);
      assertTransition("COMPLETED", "SETTLED");
    });
  });

  describe("キャンセルフロー", () => {
    it("COLLECTING状態からキャンセルできる", () => {
      expect(canTransition("COLLECTING", "CANCELLED")).toBe(true);
    });

    it("CONFIRMED状態からキャンセルできる", () => {
      expect(canTransition("CONFIRMED", "CANCELLED")).toBe(true);
    });

    it("SETTLED状態からはキャンセルできない", () => {
      expect(canTransition("SETTLED", "CANCELLED")).toBe(false);
    });
  });

  describe("助っ人確保フロー", () => {
    it("メンバー不足時に助っ人で補充して確定できる", () => {
      const game = createGame({ min_players: 9 });
      const rsvps = Array.from({ length: 6 }, (_, i) =>
        createRsvp(`m-${i + 1}`),
      );
      const helpers = [
        createHelperRequest({
          id: "hr-1",
          helper_id: "h-1",
          status: "ACCEPTED",
        }),
        createHelperRequest({
          id: "hr-2",
          helper_id: "h-2",
          status: "ACCEPTED",
        }),
        createHelperRequest({
          id: "hr-3",
          helper_id: "h-3",
          status: "ACCEPTED",
        }),
      ];

      // メンバー6 + 助っ人3 = 9 → ちょうど min_players
      const result = canConfirm({
        game,
        rsvps,
        helperRequests: helpers,
        negotiations: [createNegotiation()],
        hasGround: true,
      });
      expect(result.allowed).toBe(true);
      expect(result.reviewRequired).toBe(true); // ギリギリなのでレビュー必須

      // 充足判定
      const fulfillment = checkHelperFulfillment({
        game,
        availableMembers: 6,
        helperRequests: [
          ...helpers,
          createHelperRequest({
            id: "hr-4",
            helper_id: "h-4",
            status: "PENDING",
          }),
        ],
      });
      expect(fulfillment.fulfilled).toBe(true);
      expect(fulfillment.toCancel).toEqual(["hr-4"]); // PENDING を自動キャンセル
    });
  });

  describe("交渉不成立時の警告", () => {
    it("すべての交渉が不成立のとき停止条件の警告を返す", () => {
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

  describe("CONFIRMED → COMPLETED のガード条件", () => {
    it("試合日が未来の場合はコンテキスト付き遷移で拒否される", () => {
      const result = canTransitionWithContext("CONFIRMED", "COMPLETED", {
        gameDate: "2099-12-31",
      });
      expect(result.allowed).toBe(false);
    });
  });
});
