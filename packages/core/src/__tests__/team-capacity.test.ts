import { describe, expect, it } from "bun:test";
import {
  analyzePositions,
  analyzeTeamCapacity,
  estimateAttendance,
} from "../lib/team-capacity";
import type { Member } from "../types/domain";

function createMember(overrides: Partial<Member> = {}): Member {
  return {
    id: "m-1",
    team_id: "team-1",
    name: "テスト選手",
    tier: "PRO",
    line_user_id: null,
    email: null,
    expo_push_token: null,
    positions_json: ["投手", "外野手"],
    jersey_number: 1,
    attendance_rate: 0.8,
    no_show_rate: 0.05,
    role: "MEMBER",
    status: "ACTIVE",
    joined_at: "2026-01-01T00:00:00Z",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("analyzeTeamCapacity", () => {
  describe("健全なチームのとき", () => {
    it("警告なしのレポートを返す", () => {
      const members = Array.from({ length: 15 }, (_, i) =>
        createMember({
          id: `m-${i}`,
          name: `選手${i}`,
          positions_json: i < 2 ? ["投手"] : i < 4 ? ["捕手"] : ["外野手"],
        }),
      );
      const report = analyzeTeamCapacity(members);
      expect(report.totalMembers).toBe(15);
      expect(report.activeMembers).toBe(15);
      expect(report.averageAttendanceRate).toBe(0.8);
    });
  });

  describe("アクティブメンバーが最低人数未満のとき", () => {
    it("警告を出す", () => {
      const members = Array.from({ length: 5 }, (_, i) =>
        createMember({ id: `m-${i}`, name: `選手${i}` }),
      );
      const report = analyzeTeamCapacity(members, 9);
      expect(report.warnings).toContainEqual(
        expect.stringContaining("最低人数"),
      );
    });
  });

  describe("出席率が低いとき", () => {
    it("予想出席人数が不足している警告を出す", () => {
      const members = Array.from({ length: 12 }, (_, i) =>
        createMember({
          id: `m-${i}`,
          name: `選手${i}`,
          attendance_rate: 0.5,
          positions_json: i < 2 ? ["投手"] : i < 4 ? ["捕手"] : [],
        }),
      );
      const report = analyzeTeamCapacity(members, 9);
      // 12 * 0.5 = 6 < 9
      expect(report.warnings).toContainEqual(
        expect.stringContaining("予想出席人数"),
      );
    });
  });

  describe("無断欠席率が高いメンバーがいるとき", () => {
    it("警告を出す", () => {
      const members = [
        createMember({ id: "m-1", name: "問題児", no_show_rate: 0.3 }),
        ...Array.from({ length: 10 }, (_, i) =>
          createMember({
            id: `m-${i + 2}`,
            name: `選手${i}`,
            positions_json: i < 2 ? ["投手"] : i < 4 ? ["捕手"] : [],
          }),
        ),
      ];
      const report = analyzeTeamCapacity(members);
      expect(report.warnings).toContainEqual(
        expect.stringContaining("無断欠席率"),
      );
    });
  });

  describe("非アクティブメンバーがいるとき", () => {
    it("非アクティブメンバーを集計に含めない", () => {
      const members = [
        createMember({ id: "m-1", name: "アクティブ", status: "ACTIVE" }),
        createMember({ id: "m-2", name: "非アクティブ", status: "INACTIVE" }),
      ];
      const report = analyzeTeamCapacity(members);
      expect(report.activeMembers).toBe(1);
      expect(report.inactiveMembers).toBe(1);
    });
  });
});

describe("analyzePositions", () => {
  it("ポジション別のカバー状況を返す", () => {
    const members = [
      createMember({
        id: "m-1",
        name: "投手A",
        positions_json: ["投手"],
      }),
      createMember({
        id: "m-2",
        name: "捕手A",
        positions_json: ["捕手", "一塁手"],
      }),
    ];
    const result = analyzePositions(members);
    const pitcher = result.find((p) => p.position === "投手");
    const catcher = result.find((p) => p.position === "捕手");
    const first = result.find((p) => p.position === "一塁手");

    expect(pitcher?.count).toBe(1);
    expect(pitcher?.members).toEqual(["投手A"]);
    expect(catcher?.count).toBe(1);
    expect(first?.count).toBe(1);
  });
});

describe("estimateAttendance", () => {
  it("予想出席人数を返す", () => {
    expect(estimateAttendance(15, 0.8)).toBe(12);
    expect(estimateAttendance(10, 0.5)).toBe(5);
    expect(estimateAttendance(9, 1.0)).toBe(9);
  });
});
