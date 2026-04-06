import { describe, expect, it } from "vitest";
import { planFollowUp } from "../lib/rsvp-followup";
import type { Game, Member, Rsvp } from "../types/domain";

function createGame(overrides: Partial<Game> = {}): Game {
  return {
    id: "game-1",
    team_id: "team-1",
    title: "テスト試合",
    game_type: "FRIENDLY",
    status: "COLLECTING",
    game_date: "2026-05-01",
    start_time: "09:00",
    end_time: "12:00",
    ground_id: null,
    ground_name: null,
    opponent_team_id: null,
    min_players: 9,
    rsvp_deadline: "2026-04-28T00:00:00Z",
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

function createMember(
  overrides: Partial<
    Pick<Member, "id" | "name" | "line_user_id" | "email" | "attendance_rate">
  > = {},
) {
  return {
    id: "m-1",
    name: "テスト選手",
    line_user_id: "U123",
    email: "test@example.com",
    attendance_rate: 0.8,
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

describe("planFollowUp", () => {
  describe("人数不足で締切間近のとき", () => {
    it("HIGH優先度のフォローアップを生成する", () => {
      const now = new Date("2026-04-27T12:00:00Z"); // 締切12時間前
      const rsvps = [
        createRsvp("m-1", "AVAILABLE"),
        createRsvp("m-2", "NO_RESPONSE"),
      ];
      const members = [createMember({ id: "m-2", name: "未回答太郎" })];

      const plan = planFollowUp(createGame(), rsvps, members, now);
      expect(plan.targets).toHaveLength(1);
      expect(plan.targets[0]?.urgency).toBe("HIGH");
      expect(plan.shortage).toBe(8); // 9 - 1 = 8
    });
  });

  describe("人数不足だが締切��で���裕があるとき", () => {
    it("出席率の高いメンバーをHIGH、それ以外をMEDIUMにする", () => {
      const now = new Date("2026-04-20T00:00:00Z"); // 締切8日前
      const rsvps = [
        createRsvp("m-1", "AVAILABLE"),
        createRsvp("m-2", "NO_RESPONSE"),
        createRsvp("m-3", "NO_RESPONSE"),
      ];
      const members = [
        createMember({ id: "m-2", name: "高出���", attendance_rate: 0.9 }),
        createMember({ id: "m-3", name: "低出席", attendance_rate: 0.3 }),
      ];

      const plan = planFollowUp(createGame(), rsvps, members, now);
      expect(plan.targets[0]?.urgency).toBe("HIGH"); // 高出席率
      expect(plan.targets[1]?.urgency).toBe("MEDIUM"); // 低出席率
    });
  });

  describe("人数が充足して��るとき", () => {
    it("LOW優先度にする", () => {
      const now = new Date("2026-04-20T00:00:00Z");
      const rsvps = [
        ...Array.from({ length: 9 }, (_, i) =>
          createRsvp(`m-${i}`, "AVAILABLE"),
        ),
        createRsvp("m-extra", "NO_RESPONSE"),
      ];
      const members = [createMember({ id: "m-extra", name: "余剰メンバー" })];

      const plan = planFollowUp(createGame(), rsvps, members, now);
      expect(plan.targets[0]?.urgency).toBe("LOW");
      expect(plan.shortage).toBe(0);
    });
  });

  describe("チャネル判定", () => {
    it("LINEとEmailの両方があるときBOTHを返す", () => {
      const rsvps = [createRsvp("m-1", "NO_RESPONSE")];
      const members = [
        createMember({ id: "m-1", line_user_id: "U123", email: "a@b.com" }),
      ];
      const plan = planFollowUp(createGame(), rsvps, members);
      expect(plan.targets[0]?.suggestedChannel).toBe("BOTH");
    });

    it("LINEのみのときLINEを返す", () => {
      const rsvps = [createRsvp("m-1", "NO_RESPONSE")];
      const members = [
        createMember({ id: "m-1", line_user_id: "U123", email: null }),
      ];
      const plan = planFollowUp(createGame(), rsvps, members);
      expect(plan.targets[0]?.suggestedChannel).toBe("LINE");
    });
  });

  describe("未回答者がいないとき", () => {
    it("空のtargetsを返す", () => {
      const rsvps = [createRsvp("m-1", "AVAILABLE")];
      const members = [createMember({ id: "m-1" })];
      const plan = planFollowUp(createGame(), rsvps, members);
      expect(plan.targets).toHaveLength(0);
      expect(plan.totalNoResponse).toBe(0);
    });
  });
});
