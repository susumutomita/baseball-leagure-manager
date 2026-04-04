import { describe, expect, it } from "bun:test";
import {
  calculateMemberAttendance,
  calculateRsvpAccuracy,
  rankByAttendance,
} from "../lib/attendance-tracker";
import type { Attendance, Rsvp } from "../types/domain";

// --- テストヘルパー ---

function createAttendance(overrides: Partial<Attendance> = {}): Attendance {
  return {
    id: "att-1",
    game_id: "game-1",
    person_type: "MEMBER",
    person_id: "member-1",
    status: "ATTENDED",
    recorded_at: "2026-04-01T00:00:00Z",
    recorded_by: null,
    ...overrides,
  };
}

function createRsvp(overrides: Partial<Rsvp> = {}): Rsvp {
  return {
    id: "rsvp-1",
    game_id: "game-1",
    member_id: "member-1",
    response: "AVAILABLE",
    responded_at: "2026-04-01T00:00:00Z",
    response_channel: "APP",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// --- calculateMemberAttendance ---

describe("calculateMemberAttendance", () => {
  describe("全試合に出席したとき", () => {
    it("出席率1.0、信頼度スコア1.0を返す", () => {
      const attendances = Array.from({ length: 5 }, (_, i) =>
        createAttendance({ id: `att-${i}`, game_id: `game-${i}` }),
      );
      const result = calculateMemberAttendance(
        { id: "member-1", name: "田中" },
        attendances,
      );
      expect(result.totalGames).toBe(5);
      expect(result.attended).toBe(5);
      expect(result.attendanceRate).toBe(1);
      expect(result.reliabilityScore).toBe(1);
    });
  });

  describe("無断欠席があるとき", () => {
    it("信頼度スコアが大幅に下がる", () => {
      const attendances = [
        createAttendance({ id: "a-1", game_id: "g-1", status: "ATTENDED" }),
        createAttendance({ id: "a-2", game_id: "g-2", status: "ATTENDED" }),
        createAttendance({ id: "a-3", game_id: "g-3", status: "NO_SHOW" }),
      ];
      const result = calculateMemberAttendance(
        { id: "member-1", name: "田中" },
        attendances,
      );
      expect(result.noShow).toBe(1);
      expect(result.noShowRate).toBeCloseTo(0.333, 2);
      // 信頼度: 0.667 - 0.333*2 = 0.001 → ≈ 0
      expect(result.reliabilityScore).toBeLessThan(0.1);
    });
  });

  describe("当日キャンセルがあるとき", () => {
    it("信頼度スコアが下がるが無断欠席ほどではない", () => {
      const attendances = [
        createAttendance({ id: "a-1", game_id: "g-1", status: "ATTENDED" }),
        createAttendance({ id: "a-2", game_id: "g-2", status: "ATTENDED" }),
        createAttendance({
          id: "a-3",
          game_id: "g-3",
          status: "CANCELLED_SAME_DAY",
        }),
      ];
      const result = calculateMemberAttendance(
        { id: "member-1", name: "田中" },
        attendances,
      );
      expect(result.cancelled).toBe(1);
      // 0.667 - 0 - 0.167 = 0.5
      expect(result.reliabilityScore).toBeGreaterThan(0.4);
    });
  });

  describe("出席記録がないとき", () => {
    it("全て0を返す", () => {
      const result = calculateMemberAttendance(
        { id: "member-1", name: "田中" },
        [],
      );
      expect(result.totalGames).toBe(0);
      expect(result.attendanceRate).toBe(0);
      expect(result.reliabilityScore).toBe(0);
    });
  });

  describe("他のメンバーの出席記録を含むとき", () => {
    it("自分の記録のみ集計する", () => {
      const attendances = [
        createAttendance({
          id: "a-1",
          person_id: "member-1",
          game_id: "g-1",
        }),
        createAttendance({
          id: "a-2",
          person_id: "member-2",
          game_id: "g-1",
        }),
      ];
      const result = calculateMemberAttendance(
        { id: "member-1", name: "田中" },
        attendances,
      );
      expect(result.totalGames).toBe(1);
    });
  });
});

// --- calculateRsvpAccuracy ---

describe("calculateRsvpAccuracy", () => {
  describe("RSVP通りに出席したとき", () => {
    it("精度1.0を返す", () => {
      const rsvps = [
        createRsvp({ id: "r-1", game_id: "g-1", response: "AVAILABLE" }),
        createRsvp({ id: "r-2", game_id: "g-2", response: "AVAILABLE" }),
      ];
      const attendances = [
        createAttendance({ id: "a-1", game_id: "g-1", status: "ATTENDED" }),
        createAttendance({ id: "a-2", game_id: "g-2", status: "ATTENDED" }),
      ];
      const result = calculateRsvpAccuracy("member-1", rsvps, attendances);
      expect(result.saidYesAndAttended).toBe(2);
      expect(result.accuracy).toBe(1);
    });
  });

  describe("参加表明したが無断欠席したとき", () => {
    it("精度が下がる", () => {
      const rsvps = [
        createRsvp({ id: "r-1", game_id: "g-1", response: "AVAILABLE" }),
        createRsvp({ id: "r-2", game_id: "g-2", response: "AVAILABLE" }),
      ];
      const attendances = [
        createAttendance({ id: "a-1", game_id: "g-1", status: "ATTENDED" }),
        createAttendance({ id: "a-2", game_id: "g-2", status: "NO_SHOW" }),
      ];
      const result = calculateRsvpAccuracy("member-1", rsvps, attendances);
      expect(result.saidYesAndAttended).toBe(1);
      expect(result.saidYesButNoShow).toBe(1);
      expect(result.accuracy).toBe(0.5);
    });
  });

  describe("出席記録がないとき", () => {
    it("精度0を返す", () => {
      const rsvps = [
        createRsvp({ id: "r-1", game_id: "g-1", response: "AVAILABLE" }),
      ];
      const result = calculateRsvpAccuracy("member-1", rsvps, []);
      expect(result.accuracy).toBe(0);
    });
  });
});

// --- rankByAttendance ---

describe("rankByAttendance", () => {
  it("信頼度スコアの降順でソートする", () => {
    const stats = [
      {
        memberId: "m-1",
        name: "低信頼",
        totalGames: 10,
        attended: 5,
        noShow: 3,
        cancelled: 2,
        attendanceRate: 0.5,
        noShowRate: 0.3,
        reliabilityScore: 0.2,
      },
      {
        memberId: "m-2",
        name: "高信頼",
        totalGames: 10,
        attended: 9,
        noShow: 0,
        cancelled: 1,
        attendanceRate: 0.9,
        noShowRate: 0,
        reliabilityScore: 0.85,
      },
      {
        memberId: "m-3",
        name: "中信頼",
        totalGames: 10,
        attended: 7,
        noShow: 1,
        cancelled: 2,
        attendanceRate: 0.7,
        noShowRate: 0.1,
        reliabilityScore: 0.5,
      },
    ];
    const ranked = rankByAttendance(stats);
    expect(ranked[0]?.memberId).toBe("m-2");
    expect(ranked[1]?.memberId).toBe("m-3");
    expect(ranked[2]?.memberId).toBe("m-1");
  });

  it("元の配列を変更しない", () => {
    const stats = [
      {
        memberId: "m-1",
        name: "A",
        totalGames: 1,
        attended: 1,
        noShow: 0,
        cancelled: 0,
        attendanceRate: 1,
        noShowRate: 0,
        reliabilityScore: 0.5,
      },
    ];
    const ranked = rankByAttendance(stats);
    expect(ranked).not.toBe(stats);
  });
});
