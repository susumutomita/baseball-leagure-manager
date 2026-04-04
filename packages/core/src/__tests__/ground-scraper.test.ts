import { describe, expect, it } from "bun:test";
import { detectNewAvailability } from "../lib/ground-monitor";
import {
  type ScrapedSlot,
  ayaseAdapter,
  fujisawaAdapter,
  generateMockSlots,
  getAdapter,
  getSupportedMunicipalities,
  hiratsukAdapter,
  kamakuraAdapter,
  kanagawaAdapter,
  scrapeGround,
  yokohamaAdapter,
} from "../lib/ground-scraper";

// --- テストヘルパー ---

function createPreviousSlot(
  date: string,
  timeSlot: "MORNING" | "AFTERNOON" | "EVENING",
  status: "AVAILABLE" | "RESERVED" | "UNAVAILABLE",
) {
  return { date, time_slot: timeSlot, status };
}

// ============================================================
// グラウンドスクレイパー
// ============================================================

describe("GroundScraperAdapter", () => {
  describe("アダプターレジストリ", () => {
    it("対応する自治体のアダプターを返す", () => {
      const adapter = getAdapter("横浜市");
      expect(adapter).toBeDefined();
      expect(adapter!.municipality).toBe("横浜市");
    });

    it("未対応の自治体では undefined を返す", () => {
      const adapter = getAdapter("札幌市");
      expect(adapter).toBeUndefined();
    });

    it("6つの自治体に対応している", () => {
      const municipalities = getSupportedMunicipalities();
      expect(municipalities).toHaveLength(6);
      expect(municipalities).toContain("横浜市");
      expect(municipalities).toContain("藤沢市");
      expect(municipalities).toContain("平塚市");
      expect(municipalities).toContain("鎌倉市");
      expect(municipalities).toContain("神奈川県");
      expect(municipalities).toContain("綾瀬市");
    });
  });

  describe("各アダプターのscrapeメソッド", () => {
    const adapters = [
      yokohamaAdapter,
      fujisawaAdapter,
      hiratsukAdapter,
      kamakuraAdapter,
      kanagawaAdapter,
      ayaseAdapter,
    ];

    for (const adapter of adapters) {
      it(`${adapter.municipality}アダプターがスロットを返す`, async () => {
        const slots = await adapter.scrape("テスト球場");

        expect(slots.length).toBeGreaterThan(0);

        for (const slot of slots) {
          expect(slot.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
          expect(["MORNING", "AFTERNOON", "EVENING"]).toContain(slot.timeSlot);
          expect(["AVAILABLE", "RESERVED", "UNAVAILABLE"]).toContain(
            slot.status,
          );
        }
      });
    }
  });

  describe("scrapeGround関数", () => {
    it("対応自治体のグラウンド情報を取得する", async () => {
      const slots = await scrapeGround("横浜市", "三ツ沢球場");
      expect(slots.length).toBeGreaterThan(0);
    });

    it("未対応自治体でエラーを投げる", async () => {
      await expect(scrapeGround("札幌市", "円山球場")).rejects.toThrow(
        "未対応の自治体です: 札幌市",
      );
    });
  });

  describe("generateMockSlots", () => {
    it("2〜4週間先のスロットを生成する", () => {
      const baseDate = new Date("2026-04-01");
      const slots = generateMockSlots("test", baseDate);

      // 14日後〜28日後 = 15日間 * 3スロット = 45スロット
      expect(slots).toHaveLength(45);

      // 日付が2〜4週間先であることを確認
      const dates = slots.map((s) => s.date);
      const minDate = "2026-04-15";
      const maxDate = "2026-04-29";
      for (const d of dates) {
        expect(d >= minDate).toBe(true);
        expect(d <= maxDate).toBe(true);
      }
    });

    it("同じシードなら同じ結果を返す", () => {
      const base = new Date("2026-04-01");
      const a = generateMockSlots("seed-A", base);
      const b = generateMockSlots("seed-A", base);
      expect(a).toEqual(b);
    });

    it("異なるシードなら異なる結果を返す", () => {
      const base = new Date("2026-04-01");
      const a = generateMockSlots("seed-A", base);
      const b = generateMockSlots("seed-B", base);
      // ステータスの分布が異なるはず
      const aStatuses = a.map((s) => s.status).join(",");
      const bStatuses = b.map((s) => s.status).join(",");
      expect(aStatuses).not.toBe(bStatuses);
    });

    it("AVAILABLE / RESERVED / UNAVAILABLE の3種類が含まれる", () => {
      const slots = generateMockSlots("variety-test", new Date("2026-04-01"));
      const statuses = new Set(slots.map((s) => s.status));
      expect(statuses.has("AVAILABLE")).toBe(true);
      expect(statuses.has("RESERVED")).toBe(true);
      expect(statuses.has("UNAVAILABLE")).toBe(true);
    });
  });
});

// ============================================================
// 空き検出ロジック
// ============================================================

describe("detectNewAvailability", () => {
  describe("前回データがないとき", () => {
    it("AVAILABLEなスロットをすべて新規検出する", () => {
      const current: ScrapedSlot[] = [
        { date: "2026-04-20", timeSlot: "MORNING", status: "AVAILABLE" },
        { date: "2026-04-20", timeSlot: "AFTERNOON", status: "RESERVED" },
      ];

      const result = detectNewAvailability([], current);

      expect(result).toHaveLength(1);
      expect(result[0].date).toBe("2026-04-20");
      expect(result[0].timeSlot).toBe("MORNING");
    });
  });

  describe("前回RESERVEDだったスロットがAVAILABLEになったとき", () => {
    it("新規空きとして検出する", () => {
      const previous = [
        createPreviousSlot("2026-04-20", "MORNING", "RESERVED"),
        createPreviousSlot("2026-04-20", "AFTERNOON", "AVAILABLE"),
      ];
      const current: ScrapedSlot[] = [
        { date: "2026-04-20", timeSlot: "MORNING", status: "AVAILABLE" },
        { date: "2026-04-20", timeSlot: "AFTERNOON", status: "AVAILABLE" },
      ];

      const result = detectNewAvailability(previous, current);

      // MORNINGのみ新規 (AFTERNOONは前回もAVAILABLE)
      expect(result).toHaveLength(1);
      expect(result[0].timeSlot).toBe("MORNING");
    });
  });

  describe("前回もAVAILABLEだったスロットのとき", () => {
    it("新規検出しない", () => {
      const previous = [
        createPreviousSlot("2026-04-20", "MORNING", "AVAILABLE"),
      ];
      const current: ScrapedSlot[] = [
        { date: "2026-04-20", timeSlot: "MORNING", status: "AVAILABLE" },
      ];

      const result = detectNewAvailability(previous, current);

      expect(result).toHaveLength(0);
    });
  });

  describe("すべてRESERVEDのとき", () => {
    it("空き検出しない", () => {
      const current: ScrapedSlot[] = [
        { date: "2026-04-20", timeSlot: "MORNING", status: "RESERVED" },
        { date: "2026-04-20", timeSlot: "AFTERNOON", status: "RESERVED" },
        { date: "2026-04-20", timeSlot: "EVENING", status: "UNAVAILABLE" },
      ];

      const result = detectNewAvailability([], current);

      expect(result).toHaveLength(0);
    });
  });

  describe("複数日にまたがる新規空きのとき", () => {
    it("すべての新規空きを検出する", () => {
      const previous = [
        createPreviousSlot("2026-04-20", "MORNING", "RESERVED"),
        createPreviousSlot("2026-04-21", "AFTERNOON", "UNAVAILABLE"),
      ];
      const current: ScrapedSlot[] = [
        { date: "2026-04-20", timeSlot: "MORNING", status: "AVAILABLE" },
        { date: "2026-04-21", timeSlot: "AFTERNOON", status: "AVAILABLE" },
        { date: "2026-04-22", timeSlot: "EVENING", status: "AVAILABLE" },
      ];

      const result = detectNewAvailability(previous, current);

      expect(result).toHaveLength(3);
    });
  });
});
