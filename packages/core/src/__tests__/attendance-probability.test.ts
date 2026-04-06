import { describe, expect, it } from "vitest";
import {
  estimatePerPersonCost,
  predictAttendanceProbability,
} from "../lib/attendance-probability";

describe("predictAttendanceProbability", () => {
  describe("全員の参加率が1.0のとき", () => {
    it("確率1.0を返す", () => {
      const members = Array.from({ length: 12 }, (_, i) => ({
        id: `m${i}`,
        attendance_rate: 1.0,
      }));
      const result = predictAttendanceProbability(members, 9);
      expect(result.probability_of_min).toBe(1);
      expect(result.expected_count).toBe(12);
    });
  });

  describe("全員の参加率が0のとき", () => {
    it("確率0を返す", () => {
      const members = Array.from({ length: 12 }, (_, i) => ({
        id: `m${i}`,
        attendance_rate: 0,
      }));
      const result = predictAttendanceProbability(members, 9);
      expect(result.probability_of_min).toBe(0);
      expect(result.expected_count).toBe(0);
    });
  });

  describe("12人で参加率0.8のとき", () => {
    it("9人集まる確率を合理的な値で返す", () => {
      const members = Array.from({ length: 12 }, (_, i) => ({
        id: `m${i}`,
        attendance_rate: 0.8,
      }));
      const result = predictAttendanceProbability(members, 9);
      expect(result.expected_count).toBe(9.6);
      // 12人で80%なら9人以上の確率は高い
      expect(result.probability_of_min).toBeGreaterThan(0.7);
      expect(result.probability_of_min).toBeLessThanOrEqual(1);
    });
  });

  describe("信頼度", () => {
    it("15人以上でHIGH", () => {
      const members = Array.from({ length: 15 }, (_, i) => ({
        id: `m${i}`,
        attendance_rate: 0.8,
      }));
      expect(predictAttendanceProbability(members, 9).confidence).toBe("HIGH");
    });

    it("9-14人でMEDIUM", () => {
      const members = Array.from({ length: 10 }, (_, i) => ({
        id: `m${i}`,
        attendance_rate: 0.8,
      }));
      expect(predictAttendanceProbability(members, 9).confidence).toBe(
        "MEDIUM",
      );
    });

    it("9人未満でLOW", () => {
      const members = Array.from({ length: 7 }, (_, i) => ({
        id: `m${i}`,
        attendance_rate: 0.8,
      }));
      expect(predictAttendanceProbability(members, 9).confidence).toBe("LOW");
    });
  });
});

describe("estimatePerPersonCost", () => {
  it("一人あたりの費用を切り上げで計算する", () => {
    const result = estimatePerPersonCost(10000, 9);
    expect(result.per_person).toBe(1112); // ceil(10000/9)
    expect(result.team_cost).toBe(10000);
  });

  it("相手チーム負担分を差し引く", () => {
    const result = estimatePerPersonCost(10000, 9, 5000);
    expect(result.per_person).toBe(556); // ceil(5000/9)
    expect(result.team_cost).toBe(5000);
  });

  it("人数0のとき0を返す", () => {
    const result = estimatePerPersonCost(10000, 0);
    expect(result.per_person).toBe(0);
  });
});
