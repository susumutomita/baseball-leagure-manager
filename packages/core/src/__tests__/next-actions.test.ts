import { describe, expect, it } from "bun:test";
import {
  suggestAfterCreate,
  suggestNextActions,
  suggestOnTransitionError,
} from "../lib/next-actions";
import type { Game, Rsvp } from "../types/domain";

// --- テストヘルパー ---

function createGame(overrides: Partial<Game> = {}): Game {
  return {
    id: "game-1",
    team_id: "team-1",
    title: "テスト試合",
    game_type: "FRIENDLY",
    status: "DRAFT",
    game_date: "2026-05-01",
    start_time: "09:00",
    end_time: "12:00",
    ground_id: "ground-1",
    ground_name: "テスト球場",
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

// --- suggestNextActions ---

describe("suggestNextActions", () => {
  describe("DRAFT状態のとき", () => {
    it("COLLECTING遷移を提案する", () => {
      const actions = suggestNextActions({
        game: createGame({ status: "DRAFT" }),
      });
      const transitionAction = actions.find(
        (a) =>
          a.action === "transition_game" &&
          a.suggested_params?.new_status === "COLLECTING",
      );
      expect(transitionAction).toBeDefined();
    });

    it("game_dateが未設定のとき日付設定を提案する", () => {
      const actions = suggestNextActions({
        game: createGame({ status: "DRAFT", game_date: null }),
      });
      const updateAction = actions.find(
        (a) => a.action === "update_game" && a.reason.includes("試合日"),
      );
      expect(updateAction).toBeDefined();
    });

    it("グラウンドが未設定のときグラウンド設定を提案する", () => {
      const actions = suggestNextActions({
        game: createGame({
          status: "DRAFT",
          ground_id: null,
          ground_name: null,
        }),
      });
      const updateAction = actions.find(
        (a) => a.action === "update_game" && a.reason.includes("グラウンド"),
      );
      expect(updateAction).toBeDefined();
    });
  });

  describe("COLLECTING状態のとき", () => {
    it("RSVPが0件のとき出欠依頼を提案する", () => {
      const actions = suggestNextActions({
        game: createGame({ status: "COLLECTING" }),
        rsvps: [],
      });
      const rsvpAction = actions.find((a) => a.action === "request_rsvps");
      expect(rsvpAction).toBeDefined();
    });

    it("未回答メンバーがいるときリマインダーを提案する", () => {
      const actions = suggestNextActions({
        game: createGame({ status: "COLLECTING" }),
        rsvps: [
          createRsvp("m-1", "AVAILABLE"),
          createRsvp("m-2", "NO_RESPONSE"),
        ],
        totalMembers: 2,
      });
      const reminderAction = actions.find(
        (a) => a.action === "get_rsvps" && a.reason.includes("未回答"),
      );
      expect(reminderAction).toBeDefined();
    });

    it("全員回答済みのとき確定を提案する", () => {
      const actions = suggestNextActions({
        game: createGame({ status: "COLLECTING" }),
        rsvps: [createRsvp("m-1"), createRsvp("m-2")],
        totalMembers: 2,
      });
      const transitionAction = actions.find(
        (a) =>
          a.action === "transition_game" &&
          a.suggested_params?.new_status === "CONFIRMED",
      );
      expect(transitionAction).toBeDefined();
    });
  });

  describe("CONFIRMED状態のとき", () => {
    it("試合日が過去のときCOMPLETED遷移を提案する", () => {
      const actions = suggestNextActions({
        game: createGame({ status: "CONFIRMED", game_date: "2020-01-01" }),
      });
      const completeAction = actions.find(
        (a) =>
          a.action === "transition_game" &&
          a.suggested_params?.new_status === "COMPLETED",
      );
      expect(completeAction).toBeDefined();
    });

    it("試合日が未来のとき検証アクションを提案する", () => {
      const actions = suggestNextActions({
        game: createGame({ status: "CONFIRMED", game_date: "2099-12-31" }),
      });
      const validateAction = actions.find((a) => a.action === "validate_game");
      expect(validateAction).toBeDefined();
    });
  });

  describe("COMPLETED状態のとき", () => {
    it("経費登録と精算を提案する", () => {
      const actions = suggestNextActions({
        game: createGame({ status: "COMPLETED" }),
      });
      const expenseAction = actions.find((a) => a.action === "add_expense");
      const settleAction = actions.find(
        (a) => a.action === "calculate_settlement",
      );
      expect(expenseAction).toBeDefined();
      expect(settleAction).toBeDefined();
    });
  });

  describe("SETTLED/CANCELLED状態のとき", () => {
    it("SETTLEDではアクションなし", () => {
      const actions = suggestNextActions({
        game: createGame({ status: "SETTLED" }),
      });
      expect(actions).toHaveLength(0);
    });

    it("CANCELLEDではアクションなし", () => {
      const actions = suggestNextActions({
        game: createGame({ status: "CANCELLED" }),
      });
      expect(actions).toHaveLength(0);
    });
  });

  describe("キャンセルアクションの付与", () => {
    it("他のアクションがある状態でキャンセルを低優先で追加する", () => {
      const actions = suggestNextActions({
        game: createGame({ status: "COLLECTING" }),
        rsvps: [],
      });
      const cancelAction = actions.find(
        (a) =>
          a.action === "transition_game" &&
          a.suggested_params?.new_status === "CANCELLED",
      );
      expect(cancelAction).toBeDefined();
      expect(cancelAction?.priority).toBe("low");
    });
  });
});

// --- suggestAfterCreate ---

describe("suggestAfterCreate", () => {
  it("DRAFTのアクションを返す", () => {
    const actions = suggestAfterCreate(createGame());
    expect(actions.length).toBeGreaterThan(0);
  });
});

// --- suggestOnTransitionError ---

describe("suggestOnTransitionError", () => {
  it("CANCELLEDを除外して遷移先を返す", () => {
    const actions = suggestOnTransitionError("COLLECTING", [
      "CONFIRMED",
      "CANCELLED",
    ]);
    expect(actions).toHaveLength(1);
    expect(actions[0]?.suggested_params?.new_status).toBe("CONFIRMED");
  });

  it("遷移先が空のとき空配列を返す", () => {
    const actions = suggestOnTransitionError("SETTLED", []);
    expect(actions).toHaveLength(0);
  });
});
