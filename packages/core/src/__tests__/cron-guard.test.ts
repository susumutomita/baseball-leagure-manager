import { describe, expect, it } from "bun:test";
import {
  generateIdempotencyKey,
  isDuplicate,
  processBatch,
} from "../lib/cron-guard";

describe("generateIdempotencyKey", () => {
  it("同じ時間枠で同じキーを生成する", () => {
    const now1 = new Date("2026-04-01T10:00:00Z");
    const now2 = new Date("2026-04-01T10:05:00Z");
    const key1 = generateIdempotencyKey("send-reminders", 10, now1);
    const key2 = generateIdempotencyKey("send-reminders", 10, now2);
    expect(key1).toBe(key2);
  });

  it("異なる時間枠で異なるキーを生成する", () => {
    const now1 = new Date("2026-04-01T10:00:00Z");
    const now2 = new Date("2026-04-01T10:15:00Z");
    const key1 = generateIdempotencyKey("send-reminders", 10, now1);
    const key2 = generateIdempotencyKey("send-reminders", 10, now2);
    expect(key1).not.toBe(key2);
  });

  it("異なるジョブ名で異なるキーを生成する", () => {
    const now = new Date("2026-04-01T10:00:00Z");
    const key1 = generateIdempotencyKey("send-reminders", 10, now);
    const key2 = generateIdempotencyKey("check-deadlines", 10, now);
    expect(key1).not.toBe(key2);
  });
});

describe("isDuplicate", () => {
  it("同じキーがあればtrueを返す", () => {
    expect(isDuplicate("job:123", ["job:122", "job:123"])).toBe(true);
  });

  it("同じキーがなければfalseを返す", () => {
    expect(isDuplicate("job:124", ["job:122", "job:123"])).toBe(false);
  });
});

describe("processBatch", () => {
  it("全アイテムを処理する", async () => {
    const result = await processBatch([1, 2, 3], async () => true);
    expect(result.totalProcessed).toBe(3);
    expect(result.totalErrors).toBe(0);
  });

  it("スキップ対象を除外する", async () => {
    const result = await processBatch(
      [1, 2, 3, 4],
      async () => true,
      (n) => n % 2 === 0,
    );
    expect(result.totalProcessed).toBe(2);
    expect(result.totalSkipped).toBe(2);
  });

  it("エラーを隔離する", async () => {
    const result = await processBatch([1, 2, 3], async (n) => {
      if (n === 2) throw new Error("テストエラー");
      return true;
    });
    expect(result.totalProcessed).toBe(2);
    expect(result.totalErrors).toBe(1);
    expect(result.errors[0]?.error).toBe("テストエラー");
  });

  it("processor がfalseを返したらエラーに入る", async () => {
    const result = await processBatch([1, 2], async (n) => n !== 2);
    expect(result.totalProcessed).toBe(1);
    expect(result.totalErrors).toBe(1);
  });
});
