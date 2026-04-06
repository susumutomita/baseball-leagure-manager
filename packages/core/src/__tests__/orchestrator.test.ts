import { describe, expect, it } from "vitest";
import {
  type GameOrchestrationContext,
  type OrchestratorAction,
  type OrchestratorActionType,
  formatActionAsNotification,
  formatActionsAsSummary,
  orchestrateGame,
  orchestrateTeam,
} from "../lib/orchestrator";
import {
  createGameFixture,
  createHelperRequestFixture,
  createMembersFixture,
  createNegotiationFixture,
  createRsvpFixture,
  createRsvpsFixture,
  createTeamFixture,
} from "../lib/test-fixtures";

// --- ヘルパー ---

function createContext(
  overrides: Partial<GameOrchestrationContext> = {},
): GameOrchestrationContext {
  return {
    game: createGameFixture(),
    team: createTeamFixture(),
    rsvps: [],
    members: createMembersFixture(15),
    helperRequests: [],
    negotiations: [],
    sentNotificationTypes: [],
    ...overrides,
  };
}

function findAction(
  actions: OrchestratorAction[],
  type: OrchestratorActionType,
): OrchestratorAction | undefined {
  return actions.find((a) => a.type === type);
}

// --- テスト ---

describe("orchestrateGame", () => {
  describe("DRAFT 状態のとき", () => {
    it("試合日が設定されていれば COLLECTING への遷移を提案する", () => {
      const ctx = createContext({
        game: createGameFixture({ status: "DRAFT", game_date: "2026-05-01" }),
      });

      const result = orchestrateGame(ctx);

      const action = findAction(
        result.actions,
        "AUTO_TRANSITION_TO_COLLECTING",
      );
      expect(action).toBeDefined();
      expect(action!.priority).toBe("HIGH");
    });

    it("試合日が未設定なら何もしない", () => {
      const ctx = createContext({
        game: createGameFixture({ status: "DRAFT", game_date: null }),
      });

      const result = orchestrateGame(ctx);

      expect(result.actions.length).toBe(0);
    });
  });

  describe("COLLECTING 状態のとき", () => {
    describe("出欠依頼", () => {
      it("RSVPが0件でメンバーがいれば出欠依頼を提案する", () => {
        const members = createMembersFixture(10);
        const ctx = createContext({
          game: createGameFixture({ status: "COLLECTING" }),
          members,
          rsvps: [],
          sentNotificationTypes: [],
        });

        const result = orchestrateGame(ctx);

        const action = findAction(result.actions, "SEND_ATTENDANCE_REQUEST");
        expect(action).toBeDefined();
        expect(action!.priority).toBe("CRITICAL");
        expect(action!.params.memberCount).toBe(10);
      });

      it("出欠依頼が送信済みなら再度提案しない", () => {
        const ctx = createContext({
          game: createGameFixture({ status: "COLLECTING" }),
          rsvps: [],
          sentNotificationTypes: ["RSVP_REQUEST"],
        });

        const result = orchestrateGame(ctx);

        expect(
          findAction(result.actions, "SEND_ATTENDANCE_REQUEST"),
        ).toBeUndefined();
      });
    });

    describe("リマインダー", () => {
      it("未回答者がいればリマインダーを提案する", () => {
        const rsvps = [
          createRsvpFixture({ member_id: "m1", response: "AVAILABLE" }),
          createRsvpFixture({ member_id: "m2", response: "NO_RESPONSE" }),
          createRsvpFixture({ member_id: "m3", response: "NO_RESPONSE" }),
        ];
        const ctx = createContext({
          game: createGameFixture({ status: "COLLECTING" }),
          rsvps,
          sentNotificationTypes: [],
        });

        const result = orchestrateGame(ctx);

        const action = findAction(result.actions, "SEND_REMINDER");
        expect(action).toBeDefined();
        expect(action!.params.noResponseCount).toBe(2);
      });

      it("リマインダーが送信済みなら再度提案しない", () => {
        const rsvps = [
          createRsvpFixture({ member_id: "m1", response: "NO_RESPONSE" }),
        ];
        const ctx = createContext({
          game: createGameFixture({ status: "COLLECTING" }),
          rsvps,
          sentNotificationTypes: ["REMINDER"],
        });

        const result = orchestrateGame(ctx);

        expect(findAction(result.actions, "SEND_REMINDER")).toBeUndefined();
      });
    });

    describe("締切警告", () => {
      it("締切まで24時間以内なら警告する", () => {
        const now = new Date("2026-04-27T12:00:00Z");
        const ctx = createContext({
          game: createGameFixture({
            status: "COLLECTING",
            rsvp_deadline: "2026-04-28T00:00:00Z",
          }),
          rsvps: [
            createRsvpFixture({ member_id: "m1", response: "NO_RESPONSE" }),
          ],
        });

        const result = orchestrateGame(ctx, now);

        const action = findAction(result.actions, "WARN_DEADLINE_APPROACHING");
        expect(action).toBeDefined();
        expect(action!.priority).toBe("HIGH");
      });

      it("締切まで24時間以上なら警告しない", () => {
        const now = new Date("2026-04-26T00:00:00Z");
        const ctx = createContext({
          game: createGameFixture({
            status: "COLLECTING",
            rsvp_deadline: "2026-04-28T00:00:00Z",
          }),
        });

        const result = orchestrateGame(ctx, now);

        expect(
          findAction(result.actions, "WARN_DEADLINE_APPROACHING"),
        ).toBeUndefined();
      });
    });

    describe("人数充足通知", () => {
      it("最低人数に達したら通知する", () => {
        const memberIds = Array.from({ length: 10 }, (_, i) => `m${i}`);
        const rsvps = createRsvpsFixture(
          memberIds,
          "game-fixture-1",
          "AVAILABLE",
        );
        const ctx = createContext({
          game: createGameFixture({
            status: "COLLECTING",
            min_players: 9,
          }),
          rsvps,
          sentNotificationTypes: [],
        });

        const result = orchestrateGame(ctx);

        const action = findAction(
          result.actions,
          "NOTIFY_PLAYER_THRESHOLD_REACHED",
        );
        expect(action).toBeDefined();
      });

      it("通知済みなら再度通知しない", () => {
        const memberIds = Array.from({ length: 10 }, (_, i) => `m${i}`);
        const rsvps = createRsvpsFixture(
          memberIds,
          "game-fixture-1",
          "AVAILABLE",
        );
        const ctx = createContext({
          game: createGameFixture({
            status: "COLLECTING",
            min_players: 9,
          }),
          rsvps,
          sentNotificationTypes: ["PLAYER_THRESHOLD_REACHED"],
        });

        const result = orchestrateGame(ctx);

        expect(
          findAction(result.actions, "NOTIFY_PLAYER_THRESHOLD_REACHED"),
        ).toBeUndefined();
      });
    });

    describe("助っ人募集", () => {
      it("人数不足で助っ人リクエストがなければ募集を提案する", () => {
        const rsvps = createRsvpsFixture(
          ["m1", "m2", "m3"],
          "game-fixture-1",
          "AVAILABLE",
        );
        const ctx = createContext({
          game: createGameFixture({
            status: "COLLECTING",
            min_players: 9,
          }),
          rsvps,
          helperRequests: [],
        });

        const result = orchestrateGame(ctx);

        const action = findAction(result.actions, "SUGGEST_HELPER_RECRUITMENT");
        expect(action).toBeDefined();
        expect(action!.params.shortage).toBe(6);
      });

      it("PENDING の助っ人リクエストがあれば重複提案しない", () => {
        const rsvps = createRsvpsFixture(
          ["m1", "m2", "m3"],
          "game-fixture-1",
          "AVAILABLE",
        );
        const ctx = createContext({
          game: createGameFixture({
            status: "COLLECTING",
            min_players: 9,
          }),
          rsvps,
          helperRequests: [createHelperRequestFixture({ status: "PENDING" })],
        });

        const result = orchestrateGame(ctx);

        expect(
          findAction(result.actions, "SUGGEST_HELPER_RECRUITMENT"),
        ).toBeUndefined();
      });
    });

    describe("対戦相手", () => {
      it("グラウンドと人数が揃い、交渉がなければ対戦相手打診を提案する", () => {
        const memberIds = Array.from({ length: 10 }, (_, i) => `m${i}`);
        const rsvps = createRsvpsFixture(
          memberIds,
          "game-fixture-1",
          "AVAILABLE",
        );
        const ctx = createContext({
          game: createGameFixture({
            status: "COLLECTING",
            game_type: "FRIENDLY",
            ground_name: "テスト球場",
            min_players: 9,
          }),
          rsvps,
          negotiations: [],
        });

        const result = orchestrateGame(ctx);

        const action = findAction(result.actions, "SUGGEST_OPPONENT_CONTACT");
        expect(action).toBeDefined();
      });

      it("練習試合なら対戦相手の提案は不要", () => {
        const memberIds = Array.from({ length: 10 }, (_, i) => `m${i}`);
        const rsvps = createRsvpsFixture(
          memberIds,
          "game-fixture-1",
          "AVAILABLE",
        );
        const ctx = createContext({
          game: createGameFixture({
            status: "COLLECTING",
            game_type: "PRACTICE",
            ground_name: "テスト球場",
            min_players: 9,
          }),
          rsvps,
          negotiations: [],
        });

        const result = orchestrateGame(ctx);

        expect(
          findAction(result.actions, "SUGGEST_OPPONENT_CONTACT"),
        ).toBeUndefined();
      });

      it("交渉が全て不成立なら警告する", () => {
        const ctx = createContext({
          game: createGameFixture({
            status: "COLLECTING",
            game_type: "FRIENDLY",
          }),
          negotiations: [
            createNegotiationFixture({ status: "DECLINED" }),
            createNegotiationFixture({
              id: "n2",
              status: "CANCELLED",
            }),
          ],
        });

        const result = orchestrateGame(ctx);

        const action = findAction(
          result.actions,
          "WARN_ALL_NEGOTIATIONS_FAILED",
        );
        expect(action).toBeDefined();
      });
    });

    describe("試合確定可能通知", () => {
      it("全条件を満たしたら確定可能を通知する", () => {
        const memberIds = Array.from({ length: 10 }, (_, i) => `m${i}`);
        const rsvps = createRsvpsFixture(
          memberIds,
          "game-fixture-1",
          "AVAILABLE",
        );
        const ctx = createContext({
          game: createGameFixture({
            status: "COLLECTING",
            game_type: "FRIENDLY",
            ground_name: "テスト球場",
            min_players: 9,
          }),
          rsvps,
          negotiations: [createNegotiationFixture({ status: "ACCEPTED" })],
        });

        const result = orchestrateGame(ctx);

        const action = findAction(result.actions, "NOTIFY_READY_TO_CONFIRM");
        expect(action).toBeDefined();
        expect(action!.priority).toBe("CRITICAL");
      });

      it("練習試合は対戦相手不要で確定可能", () => {
        const memberIds = Array.from({ length: 10 }, (_, i) => `m${i}`);
        const rsvps = createRsvpsFixture(
          memberIds,
          "game-fixture-1",
          "AVAILABLE",
        );
        const ctx = createContext({
          game: createGameFixture({
            status: "COLLECTING",
            game_type: "PRACTICE",
            ground_name: "テスト球場",
            min_players: 9,
          }),
          rsvps,
          negotiations: [],
        });

        const result = orchestrateGame(ctx);

        const action = findAction(result.actions, "NOTIFY_READY_TO_CONFIRM");
        expect(action).toBeDefined();
      });
    });
  });

  describe("CONFIRMED 状態のとき", () => {
    it("試合前日にリマインダーを提案する", () => {
      const now = new Date("2026-04-30T20:00:00Z");
      const rsvps = createRsvpsFixture(
        ["m1", "m2", "m3"],
        "game-fixture-1",
        "AVAILABLE",
      );
      const ctx = createContext({
        game: createGameFixture({
          status: "CONFIRMED",
          game_date: "2026-05-01",
        }),
        rsvps,
      });

      const result = orchestrateGame(ctx, now);

      const action = findAction(result.actions, "NOTIFY_GAME_READY");
      expect(action).toBeDefined();
    });

    it("試合が24時間以上先なら何もしない", () => {
      const now = new Date("2026-04-29T00:00:00Z");
      const ctx = createContext({
        game: createGameFixture({
          status: "CONFIRMED",
          game_date: "2026-05-01",
        }),
      });

      const result = orchestrateGame(ctx, now);

      expect(findAction(result.actions, "NOTIFY_GAME_READY")).toBeUndefined();
    });
  });

  describe("COMPLETED/SETTLED/CANCELLED 状態のとき", () => {
    it("アクションを生成しない", () => {
      for (const status of ["COMPLETED", "SETTLED", "CANCELLED"] as const) {
        const ctx = createContext({
          game: createGameFixture({ status }),
        });
        const result = orchestrateGame(ctx);
        expect(result.actions.length).toBe(0);
      }
    });
  });

  describe("アクションの優先度ソート", () => {
    it("CRITICAL > HIGH > MEDIUM > LOW の順にソートされる", () => {
      const memberIds = Array.from({ length: 10 }, (_, i) => `m${i}`);
      const rsvps = createRsvpsFixture(
        memberIds,
        "game-fixture-1",
        "AVAILABLE",
      );
      // 全条件を満たした状態 + リマインダー未送信 + 未回答者ありの複合状態を作る
      const allRsvps = [
        ...rsvps,
        createRsvpFixture({ member_id: "m-extra", response: "NO_RESPONSE" }),
      ];

      const ctx = createContext({
        game: createGameFixture({
          status: "COLLECTING",
          game_type: "FRIENDLY",
          ground_name: "テスト球場",
          min_players: 9,
        }),
        rsvps: allRsvps,
        negotiations: [createNegotiationFixture({ status: "ACCEPTED" })],
        sentNotificationTypes: [],
      });

      const result = orchestrateGame(ctx);

      // CRITICAL が最初に来ることを確認
      if (result.actions.length >= 2) {
        const priorities = result.actions.map((a) => a.priority);
        const order = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
        for (let i = 1; i < priorities.length; i++) {
          expect(order[priorities[i]]).toBeGreaterThanOrEqual(
            order[priorities[i - 1]],
          );
        }
      }
    });
  });
});

describe("orchestrateTeam", () => {
  it("複数ゲームの結果をまとめて返す", () => {
    const contexts = [
      createContext({
        game: createGameFixture({
          id: "g1",
          status: "DRAFT",
          game_date: "2026-05-01",
        }),
      }),
      createContext({
        game: createGameFixture({
          id: "g2",
          status: "COLLECTING",
        }),
      }),
    ];

    const result = orchestrateTeam("team-1", "テストチーム", contexts);

    expect(result.games.length).toBe(2);
    expect(result.teamId).toBe("team-1");
    expect(result.teamName).toBe("テストチーム");
    expect(result.totalActions).toBeGreaterThanOrEqual(0);
  });
});

describe("formatActionAsNotification", () => {
  it("優先度に応じたプレフィックスを付与する", () => {
    const action = {
      type: "SEND_ATTENDANCE_REQUEST" as const,
      priority: "CRITICAL" as const,
      description: "テスト説明",
      gameId: "g1",
      params: {},
    };

    const text = formatActionAsNotification(action);

    expect(text).toBe("[重要] テスト説明");
  });
});

describe("formatActionsAsSummary", () => {
  it("アクションがなければ「対応不要」メッセージを返す", () => {
    const result = formatActionsAsSummary([]);
    expect(result).toContain("対応が必要な試合はありません");
  });

  it("アクションがあれば一覧を返す", () => {
    const results = [
      {
        gameId: "g1",
        gameTitle: "テスト試合",
        status: "COLLECTING" as const,
        actions: [
          {
            type: "SEND_ATTENDANCE_REQUEST" as const,
            priority: "CRITICAL" as const,
            description: "出欠依頼を送信してください",
            gameId: "g1",
            params: {},
          },
        ],
      },
    ];

    const text = formatActionsAsSummary(results);

    expect(text).toContain("テスト試合");
    expect(text).toContain("[重要]");
    expect(text).toContain("出欠依頼を送信してください");
  });
});
