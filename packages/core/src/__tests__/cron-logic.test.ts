import { describe, expect, it } from "vitest";
import {
  findGamesNeedingReminder,
  findGamesPassedDeadline,
  shouldSendReminder,
} from "../lib/cron-logic";
import type { CronGameInput } from "../lib/cron-logic";

// --- テストヘルパー ---

function createCronGame(overrides: Partial<CronGameInput> = {}): CronGameInput {
  return {
    id: "game-1",
    status: "COLLECTING",
    rsvp_deadline: "2026-05-01T12:00:00Z",
    ...overrides,
  };
}

/** 指定した時間分を Date に足す */
function hoursFromNow(baseDate: Date, hours: number): Date {
  return new Date(baseDate.getTime() + hours * 60 * 60 * 1000);
}

// --- shouldSendReminder ---

describe("shouldSendReminder", () => {
  describe("COLLECTING で締切が48時間以内のとき", () => {
    it("true を返す", () => {
      const deadline = "2026-05-01T12:00:00Z";
      const now = new Date("2026-04-30T00:00:00Z"); // 36時間前

      const result = shouldSendReminder(
        createCronGame({ rsvp_deadline: deadline }),
        now,
      );

      expect(result).toBe(true);
    });
  });

  describe("締切がちょうど48時間後のとき", () => {
    it("true を返す (境界値)", () => {
      const now = new Date("2026-05-01T00:00:00Z");
      const deadline = new Date(
        now.getTime() + 48 * 60 * 60 * 1000,
      ).toISOString();

      const result = shouldSendReminder(
        createCronGame({ rsvp_deadline: deadline }),
        now,
      );

      expect(result).toBe(true);
    });
  });

  describe("締切が48時間より先のとき", () => {
    it("false を返す", () => {
      const now = new Date("2026-04-28T00:00:00Z"); // 3日以上前
      const deadline = "2026-05-01T12:00:00Z";

      const result = shouldSendReminder(
        createCronGame({ rsvp_deadline: deadline }),
        now,
      );

      expect(result).toBe(false);
    });
  });

  describe("締切が既に過ぎているとき", () => {
    it("false を返す", () => {
      const now = new Date("2026-05-02T00:00:00Z"); // 締切の後
      const deadline = "2026-05-01T12:00:00Z";

      const result = shouldSendReminder(
        createCronGame({ rsvp_deadline: deadline }),
        now,
      );

      expect(result).toBe(false);
    });
  });

  describe("status が COLLECTING 以外のとき", () => {
    it("false を返す", () => {
      const now = new Date("2026-04-30T12:00:00Z");

      const result = shouldSendReminder(
        createCronGame({ status: "CONFIRMED" }),
        now,
      );

      expect(result).toBe(false);
    });
  });

  describe("rsvp_deadline が null のとき", () => {
    it("false を返す", () => {
      const now = new Date("2026-04-30T12:00:00Z");

      const result = shouldSendReminder(
        createCronGame({ rsvp_deadline: null }),
        now,
      );

      expect(result).toBe(false);
    });
  });

  describe("カスタムウィンドウ (24時間) を指定したとき", () => {
    it("24時間以内であれば true を返す", () => {
      const now = new Date("2026-05-01T00:00:00Z");
      const deadline = "2026-05-01T12:00:00Z"; // 12時間後
      const windowMs = 24 * 60 * 60 * 1000;

      const result = shouldSendReminder(
        createCronGame({ rsvp_deadline: deadline }),
        now,
        windowMs,
      );

      expect(result).toBe(true);
    });

    it("24時間より先であれば false を返す", () => {
      const now = new Date("2026-04-29T00:00:00Z");
      const deadline = "2026-05-01T12:00:00Z"; // 60時間後
      const windowMs = 24 * 60 * 60 * 1000;

      const result = shouldSendReminder(
        createCronGame({ rsvp_deadline: deadline }),
        now,
        windowMs,
      );

      expect(result).toBe(false);
    });
  });
});

// --- findGamesNeedingReminder ---

describe("findGamesNeedingReminder", () => {
  describe("複数のゲームがあるとき", () => {
    it("リマインダー対象のゲームのみ返す", () => {
      const now = new Date("2026-05-01T00:00:00Z");
      const games = [
        createCronGame({
          id: "within-window",
          rsvp_deadline: "2026-05-01T12:00:00Z", // 12時間後
        }),
        createCronGame({
          id: "too-far",
          rsvp_deadline: "2026-05-10T12:00:00Z", // 9日後
        }),
        createCronGame({
          id: "already-passed",
          rsvp_deadline: "2026-04-30T00:00:00Z", // 過ぎている
        }),
        createCronGame({
          id: "no-deadline",
          rsvp_deadline: null,
        }),
        createCronGame({
          id: "wrong-status",
          status: "CONFIRMED",
          rsvp_deadline: "2026-05-01T12:00:00Z",
        }),
      ];

      const result = findGamesNeedingReminder(games, now);

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe("within-window");
    });
  });

  describe("空の配列のとき", () => {
    it("空の配列を返す", () => {
      const result = findGamesNeedingReminder(
        [],
        new Date("2026-05-01T00:00:00Z"),
      );

      expect(result).toEqual([]);
    });
  });

  describe("すべてのゲームが対象のとき", () => {
    it("全ゲームを返す", () => {
      const now = new Date("2026-05-01T00:00:00Z");
      const games = [
        createCronGame({
          id: "g1",
          rsvp_deadline: hoursFromNow(now, 10).toISOString(),
        }),
        createCronGame({
          id: "g2",
          rsvp_deadline: hoursFromNow(now, 24).toISOString(),
        }),
      ];

      const result = findGamesNeedingReminder(games, now);

      expect(result).toHaveLength(2);
    });
  });
});

// --- findGamesPassedDeadline ---

describe("findGamesPassedDeadline", () => {
  describe("締切を過ぎたゲームがあるとき", () => {
    it("締切を過ぎたゲームのみ返す", () => {
      const now = new Date("2026-05-01T12:00:00Z");
      const games = [
        createCronGame({
          id: "passed",
          rsvp_deadline: "2026-05-01T00:00:00Z", // 12時間前
        }),
        createCronGame({
          id: "future",
          rsvp_deadline: "2026-05-02T00:00:00Z", // 12時間後
        }),
      ];

      const result = findGamesPassedDeadline(games, now);

      expect(result).toHaveLength(1);
      expect(result[0]!.id).toBe("passed");
    });
  });

  describe("締切がちょうど現在時刻のとき", () => {
    it("対象に含める (境界値)", () => {
      const now = new Date("2026-05-01T12:00:00Z");
      const games = [
        createCronGame({
          id: "exact",
          rsvp_deadline: "2026-05-01T12:00:00Z",
        }),
      ];

      const result = findGamesPassedDeadline(games, now);

      expect(result).toHaveLength(1);
    });
  });

  describe("COLLECTING 以外のゲームのとき", () => {
    it("対象外にする", () => {
      const now = new Date("2026-05-02T00:00:00Z");
      const games = [
        createCronGame({
          id: "confirmed",
          status: "CONFIRMED",
          rsvp_deadline: "2026-05-01T00:00:00Z",
        }),
        createCronGame({
          id: "cancelled",
          status: "CANCELLED",
          rsvp_deadline: "2026-05-01T00:00:00Z",
        }),
      ];

      const result = findGamesPassedDeadline(games, now);

      expect(result).toHaveLength(0);
    });
  });

  describe("rsvp_deadline が null のゲームのとき", () => {
    it("対象外にする", () => {
      const now = new Date("2026-05-02T00:00:00Z");
      const games = [createCronGame({ rsvp_deadline: null })];

      const result = findGamesPassedDeadline(games, now);

      expect(result).toHaveLength(0);
    });
  });

  describe("空の配列のとき", () => {
    it("空の配列を返す", () => {
      const result = findGamesPassedDeadline(
        [],
        new Date("2026-05-01T00:00:00Z"),
      );

      expect(result).toEqual([]);
    });
  });
});
