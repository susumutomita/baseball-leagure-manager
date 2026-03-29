import { describe, expect, it } from "bun:test";
import {
  calculateConfidence,
  canConfirm,
  checkStopConditions,
} from "../lib/governor";
import type { GovernorContext } from "../lib/governor";
import type {
  AvailabilityResponse,
  MatchRequest,
  Negotiation,
} from "../types/domain";

// --- テストヘルパー ---

function createMatchRequest(
  overrides: Partial<MatchRequest> = {},
): MatchRequest {
  return {
    id: "mr-1",
    team_id: "team-1",
    title: "テスト試合",
    desired_dates_json: ["2026-05-01"],
    preferred_time_slots_json: ["9:00-12:00"],
    area: "東京都",
    level_requirement: "INTERMEDIATE",
    needs_ground: true,
    budget_limit: 5000,
    status: "READY_TO_CONFIRM",
    confidence_score: 0,
    review_required: false,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function createNegotiation(overrides: Partial<Negotiation> = {}): Negotiation {
  return {
    id: "neg-1",
    match_request_id: "mr-1",
    opponent_team_id: "opp-1",
    proposed_dates_json: ["2026-05-01"],
    generated_message: null,
    reply_message: null,
    status: "ACCEPTED",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function createAvailability(
  memberId: string,
  response: "AVAILABLE" | "UNAVAILABLE" | "MAYBE" | "UNKNOWN" = "AVAILABLE",
): AvailabilityResponse {
  return {
    id: `avail-${memberId}`,
    match_request_id: "mr-1",
    member_id: memberId,
    response,
    comment: null,
    responded_at: "2026-01-01T00:00:00Z",
  };
}

function createContext(
  overrides: Partial<GovernorContext> = {},
): GovernorContext {
  return {
    matchRequest: createMatchRequest(),
    negotiations: [createNegotiation()],
    availabilities: Array.from({ length: 9 }, (_, i) =>
      createAvailability(`m-${i + 1}`),
    ),
    memberCount: 15,
    minPlayers: 9,
    hasGround: true,
    ...overrides,
  };
}

// --- テスト本体 ---

describe("Governor (ルールエンジン)", () => {
  describe("canConfirm", () => {
    describe("すべての条件を満たしているとき", () => {
      it("確定を許可する", () => {
        const result = canConfirm(createContext());
        expect(result.allowed).toBe(true);
        expect(result.reasons).toHaveLength(0);
      });
    });

    describe("参加可能人数が最低人数に満たないとき", () => {
      it("確定を許可しない", () => {
        const result = canConfirm(
          createContext({
            availabilities: Array.from({ length: 5 }, (_, i) =>
              createAvailability(`m-${i + 1}`),
            ),
          }),
        );
        expect(result.allowed).toBe(false);
        expect(result.reasons).toContainEqual(
          expect.stringContaining("参加可能人数が不足"),
        );
      });
    });

    describe("承諾済みの対戦相手がいないとき", () => {
      it("確定を許可しない", () => {
        const result = canConfirm(
          createContext({
            negotiations: [createNegotiation({ status: "SENT" })],
          }),
        );
        expect(result.allowed).toBe(false);
        expect(result.reasons).toContainEqual(
          expect.stringContaining("承諾済みの対戦相手がいません"),
        );
      });
    });

    describe("グラウンドが必要だが未確保のとき", () => {
      it("確定を許可しない", () => {
        const result = canConfirm(createContext({ hasGround: false }));
        expect(result.allowed).toBe(false);
        expect(result.reasons).toContainEqual(
          expect.stringContaining("グラウンドが未確保"),
        );
      });
    });

    describe("グラウンドが不要のとき", () => {
      it("グラウンド未確保でも確定を許可する", () => {
        const result = canConfirm(
          createContext({
            matchRequest: createMatchRequest({ needs_ground: false }),
            hasGround: false,
          }),
        );
        expect(result.allowed).toBe(true);
      });
    });

    describe("複数の条件が同時に満たされないとき", () => {
      it("すべてのエラー理由を返す", () => {
        const result = canConfirm(
          createContext({
            negotiations: [],
            availabilities: [],
            hasGround: false,
          }),
        );
        expect(result.allowed).toBe(false);
        expect(result.reasons.length).toBeGreaterThanOrEqual(3);
      });
    });

    describe("参加可能人数がギリギリのとき", () => {
      it("reviewRequiredをtrueにする", () => {
        const result = canConfirm(
          createContext({
            availabilities: Array.from({ length: 9 }, (_, i) =>
              createAvailability(`m-${i + 1}`),
            ),
          }),
        );
        expect(result.reviewRequired).toBe(true);
      });

      it("余裕があればreviewRequiredはfalse", () => {
        const result = canConfirm(
          createContext({
            availabilities: Array.from({ length: 12 }, (_, i) =>
              createAvailability(`m-${i + 1}`),
            ),
          }),
        );
        expect(result.reviewRequired).toBe(false);
      });
    });
  });

  describe("checkStopConditions", () => {
    describe("希望日が設定されていないとき", () => {
      it("警告を返す", () => {
        const warnings = checkStopConditions(
          createContext({
            matchRequest: createMatchRequest({ desired_dates_json: [] }),
          }),
        );
        expect(warnings).toContainEqual(
          expect.stringContaining("希望日が設定されていません"),
        );
      });
    });

    describe("すべての交渉が不成立のとき", () => {
      it("警告を返す", () => {
        const warnings = checkStopConditions(
          createContext({
            negotiations: [
              createNegotiation({ status: "DECLINED" }),
              createNegotiation({
                id: "neg-2",
                status: "DECLINED",
              }),
            ],
          }),
        );
        expect(warnings).toContainEqual(
          expect.stringContaining("すべての交渉が不成立"),
        );
      });
    });

    describe("条件が正常なとき", () => {
      it("空配列を返す", () => {
        const warnings = checkStopConditions(createContext());
        expect(warnings).toHaveLength(0);
      });
    });
  });

  describe("calculateConfidence", () => {
    describe("すべての条件が完璧に揃っているとき", () => {
      it("スコア100を返す", () => {
        const score = calculateConfidence(createContext());
        expect(score).toBe(100);
      });
    });

    describe("対戦相手の状態による加点", () => {
      it("承諾済みなら40点加算される", () => {
        const base = calculateConfidence(
          createContext({
            negotiations: [],
            availabilities: [],
            hasGround: false,
            matchRequest: createMatchRequest({ needs_ground: true }),
          }),
        );
        const withAccepted = calculateConfidence(
          createContext({
            negotiations: [createNegotiation({ status: "ACCEPTED" })],
            availabilities: [],
            hasGround: false,
            matchRequest: createMatchRequest({ needs_ground: true }),
          }),
        );
        expect(withAccepted - base).toBe(40);
      });

      it("返信ありなら20点加算される", () => {
        const withReplied = calculateConfidence(
          createContext({
            negotiations: [createNegotiation({ status: "REPLIED" })],
            availabilities: [],
            hasGround: false,
            matchRequest: createMatchRequest({ needs_ground: true }),
          }),
        );
        expect(withReplied).toBe(20);
      });

      it("送信済みなら5点加算される", () => {
        const withSent = calculateConfidence(
          createContext({
            negotiations: [createNegotiation({ status: "SENT" })],
            availabilities: [],
            hasGround: false,
            matchRequest: createMatchRequest({ needs_ground: true }),
          }),
        );
        expect(withSent).toBe(5);
      });
    });

    describe("グラウンド確保による加点", () => {
      it("確保済みなら30点加算される", () => {
        const without = calculateConfidence(
          createContext({
            negotiations: [],
            availabilities: [],
            hasGround: false,
            matchRequest: createMatchRequest({ needs_ground: true }),
          }),
        );
        const withGround = calculateConfidence(
          createContext({
            negotiations: [],
            availabilities: [],
            hasGround: true,
          }),
        );
        expect(withGround - without).toBe(30);
      });
    });

    describe("何も揃っていないとき", () => {
      it("スコア0を返す", () => {
        const score = calculateConfidence(
          createContext({
            negotiations: [],
            availabilities: [],
            hasGround: false,
            matchRequest: createMatchRequest({ needs_ground: true }),
          }),
        );
        expect(score).toBe(0);
      });
    });
  });
});
