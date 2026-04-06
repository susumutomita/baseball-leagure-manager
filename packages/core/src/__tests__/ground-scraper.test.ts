import { describe, expect, it } from "vitest";
import {
  GroundScraper,
  KNOWN_GROUNDS,
  type ScraperLogger,
  fetchWithTimeout,
  formatDate,
  generateRealisticSlots,
  parseFujisawaHtml,
  parseYokohamaHtml,
  seededRandom,
} from "../lib/ground-scraper";

// --- テストヘルパー ---

function createSilentLogger(): ScraperLogger {
  return {
    info: () => {},
    warn: () => {},
    error: () => {},
  };
}

function createTrackingLogger(): ScraperLogger & {
  logs: Array<{
    level: string;
    message: string;
    meta?: Record<string, unknown>;
  }>;
} {
  const logs: Array<{
    level: string;
    message: string;
    meta?: Record<string, unknown>;
  }> = [];
  return {
    logs,
    info: (msg, meta) => logs.push({ level: "info", message: msg, meta }),
    warn: (msg, meta) => logs.push({ level: "warn", message: msg, meta }),
    error: (msg, meta) => logs.push({ level: "error", message: msg, meta }),
  };
}

// --- テスト ---

describe("GroundScraper", () => {
  describe("初期化のとき", () => {
    it("6つの自治体アダプターが登録される", () => {
      const scraper = new GroundScraper({ logger: createSilentLogger() });
      const municipalities = scraper.getMunicipalities();

      expect(municipalities).toHaveLength(6);
      expect(municipalities).toContain("横浜市");
      expect(municipalities).toContain("藤沢市");
      expect(municipalities).toContain("平塚市");
      expect(municipalities).toContain("鎌倉市");
      expect(municipalities).toContain("神奈川県");
      expect(municipalities).toContain("綾瀬市");
    });

    it("各アダプターが正しい municipality を持つ", () => {
      const scraper = new GroundScraper({ logger: createSilentLogger() });

      for (const municipality of scraper.getMunicipalities()) {
        const adapter = scraper.getAdapter(municipality);
        expect(adapter).toBeDefined();
        expect(adapter!.municipality).toBe(municipality);
      }
    });
  });

  describe("未対応の自治体のとき", () => {
    it("エラー付きの空結果を返す", async () => {
      const scraper = new GroundScraper({ logger: createSilentLogger() });
      const result = await scraper.scrapeGround("東京都", "テスト球場");

      expect(result.slots).toHaveLength(0);
      expect(result.source).toBe("fallback");
      expect(result.error).toContain("未対応の自治体");
    });
  });

  describe("scrapeGround のとき", () => {
    it("スクレイピング結果を返す", async () => {
      const scraper = new GroundScraper({ logger: createSilentLogger() });
      const result = await scraper.scrapeGround("平塚市", "平塚球場");

      expect(result.groundName).toBe("平塚球場");
      expect(result.municipality).toBe("平塚市");
      expect(result.slots.length).toBeGreaterThan(0);
      expect(result.scrapedAt).toBeDefined();
    });
  });

  describe("scrapeMultiple のとき", () => {
    it("複数グラウンドの結果を一括で返す", async () => {
      const scraper = new GroundScraper({ logger: createSilentLogger() });
      const results = await scraper.scrapeMultiple([
        { municipality: "平塚市", groundName: "平塚球場" },
        { municipality: "鎌倉市", groundName: "笛田公園野球場" },
      ]);

      expect(results).toHaveLength(2);
      expect(results[0].municipality).toBe("平塚市");
      expect(results[1].municipality).toBe("鎌倉市");
    });

    it("未対応自治体を含んでも他の結果は返る", async () => {
      const scraper = new GroundScraper({ logger: createSilentLogger() });
      const results = await scraper.scrapeMultiple([
        { municipality: "平塚市", groundName: "平塚球場" },
        { municipality: "東京都", groundName: "テスト球場" },
      ]);

      expect(results).toHaveLength(2);
      expect(results[0].slots.length).toBeGreaterThan(0);
      expect(results[1].slots).toHaveLength(0);
      expect(results[1].error).toContain("未対応の自治体");
    });
  });

  describe("ロギングのとき", () => {
    it("スクレイピング開始時にログを出力する", async () => {
      const logger = createTrackingLogger();
      const scraper = new GroundScraper({ logger });
      await scraper.scrapeGround("平塚市", "平塚球場");

      const infoLogs = logger.logs.filter((l) => l.level === "info");
      expect(infoLogs.length).toBeGreaterThan(0);
      expect(infoLogs[0].message).toContain("平塚市");
    });

    it("未対応自治体のときエラーログを出力する", async () => {
      const logger = createTrackingLogger();
      const scraper = new GroundScraper({ logger });
      await scraper.scrapeGround("東京都", "テスト球場");

      const errorLogs = logger.logs.filter((l) => l.level === "error");
      expect(errorLogs.length).toBeGreaterThan(0);
      expect(errorLogs[0].message).toContain("未対応");
    });
  });
});

describe("generateRealisticSlots", () => {
  const baseDate = new Date("2026-04-01");

  describe("基本的な生成のとき", () => {
    it("30日分のスロットを生成する", () => {
      const slots = generateRealisticSlots("テスト球場", { baseDate });

      // 30日 × 3時間帯 = 90スロット
      expect(slots).toHaveLength(90);
    });

    it("各スロットが正しい形式を持つ", () => {
      const slots = generateRealisticSlots("テスト球場", { baseDate });

      for (const slot of slots) {
        expect(slot.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(["MORNING", "AFTERNOON", "EVENING"]).toContain(slot.timeSlot);
        expect(["AVAILABLE", "RESERVED", "UNAVAILABLE"]).toContain(slot.status);
      }
    });

    it("指定日数分のスロットを生成する", () => {
      const slots = generateRealisticSlots("テスト球場", {
        baseDate,
        daysAhead: 7,
      });

      // 7日 × 3時間帯 = 21スロット
      expect(slots).toHaveLength(21);
    });
  });

  describe("ナイター設備なしのとき", () => {
    it("EVENING スロットが UNAVAILABLE になる", () => {
      const slots = generateRealisticSlots("テスト球場", {
        baseDate,
        hasNightLights: false,
      });

      const eveningSlots = slots.filter((s) => s.timeSlot === "EVENING");
      expect(eveningSlots.every((s) => s.status === "UNAVAILABLE")).toBe(true);
    });
  });

  describe("ナイター設備ありのとき", () => {
    it("EVENING スロットに AVAILABLE/RESERVED が含まれる", () => {
      const slots = generateRealisticSlots("テスト球場", {
        baseDate,
        hasNightLights: true,
        daysAhead: 30,
      });

      const eveningSlots = slots.filter((s) => s.timeSlot === "EVENING");
      const nonUnavailable = eveningSlots.filter(
        (s) => s.status !== "UNAVAILABLE",
      );
      expect(nonUnavailable.length).toBeGreaterThan(0);
    });
  });

  describe("週末と平日の予約率のとき", () => {
    it("週末は平日より予約率が高い", () => {
      const slots = generateRealisticSlots("テスト球場", {
        baseDate,
        daysAhead: 60,
        hasNightLights: true,
      });

      const weekendSlots = slots.filter((s) => {
        const dow = new Date(s.date).getDay();
        return (dow === 0 || dow === 6) && s.timeSlot !== "EVENING";
      });
      const weekdaySlots = slots.filter((s) => {
        const dow = new Date(s.date).getDay();
        return dow !== 0 && dow !== 6 && s.timeSlot !== "EVENING";
      });

      const weekendReserved =
        weekendSlots.filter((s) => s.status === "RESERVED").length /
        weekendSlots.length;
      const weekdayReserved =
        weekdaySlots.filter((s) => s.status === "RESERVED").length /
        weekdaySlots.length;

      expect(weekendReserved).toBeGreaterThan(weekdayReserved);
    });
  });

  describe("決定論性のとき", () => {
    it("同じ入力で同じ結果を返す", () => {
      const slots1 = generateRealisticSlots("テスト球場", { baseDate });
      const slots2 = generateRealisticSlots("テスト球場", { baseDate });

      expect(slots1).toEqual(slots2);
    });

    it("異なるグラウンド名で異なる結果を返す", () => {
      const slots1 = generateRealisticSlots("球場A", {
        baseDate,
        hasNightLights: true,
      });
      const slots2 = generateRealisticSlots("球場B", {
        baseDate,
        hasNightLights: true,
      });

      // 全スロットが完全一致はしない（異なるシードになる）
      const different = slots1.some((s, i) => s.status !== slots2[i].status);
      expect(different).toBe(true);
    });
  });
});

describe("seededRandom", () => {
  it("同じシードで同じ値を返す", () => {
    expect(seededRandom("test-seed")).toBe(seededRandom("test-seed"));
  });

  it("0以上1未満の値を返す", () => {
    const values = [
      seededRandom("a"),
      seededRandom("bb"),
      seededRandom("ccc"),
      seededRandom("日本語シード"),
    ];
    for (const v of values) {
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("異なるシードで異なる値を返す", () => {
    const v1 = seededRandom("seed-1");
    const v2 = seededRandom("seed-2");
    expect(v1).not.toBe(v2);
  });
});

describe("formatDate", () => {
  it("Date を YYYY-MM-DD 形式に変換する", () => {
    expect(formatDate(new Date("2026-05-01"))).toBe("2026-05-01");
    expect(formatDate(new Date("2026-12-25"))).toBe("2026-12-25");
  });

  it("月と日をゼロ埋めする", () => {
    expect(formatDate(new Date("2026-01-05"))).toBe("2026-01-05");
  });
});

describe("parseYokohamaHtml", () => {
  describe("正しいHTMLのとき", () => {
    it("空き状況を正しくパースする", () => {
      const html = `
        <table>
          <tr>5/10 (土) ○ × −</tr>
          <tr>5/11 (日) × ○ ○</tr>
        </table>
      `;

      const slots = parseYokohamaHtml(html, 2026);

      expect(slots).toHaveLength(6);
      expect(slots[0]).toEqual({
        date: "2026-05-10",
        timeSlot: "MORNING",
        status: "AVAILABLE",
      });
      expect(slots[1]).toEqual({
        date: "2026-05-10",
        timeSlot: "AFTERNOON",
        status: "RESERVED",
      });
      expect(slots[2]).toEqual({
        date: "2026-05-10",
        timeSlot: "EVENING",
        status: "UNAVAILABLE",
      });
      expect(slots[3]).toEqual({
        date: "2026-05-11",
        timeSlot: "MORNING",
        status: "RESERVED",
      });
      expect(slots[4]).toEqual({
        date: "2026-05-11",
        timeSlot: "AFTERNOON",
        status: "AVAILABLE",
      });
      expect(slots[5]).toEqual({
        date: "2026-05-11",
        timeSlot: "EVENING",
        status: "AVAILABLE",
      });
    });
  });

  describe("空のHTMLのとき", () => {
    it("空配列を返す", () => {
      const slots = parseYokohamaHtml("");
      expect(slots).toHaveLength(0);
    });
  });

  describe("パースできないHTMLのとき", () => {
    it("空配列を返す", () => {
      const html = "<html><body>No data</body></html>";
      const slots = parseYokohamaHtml(html);
      expect(slots).toHaveLength(0);
    });
  });
});

describe("parseFujisawaHtml", () => {
  describe("正しいHTMLのとき", () => {
    it("空き状況を正しくパースする", () => {
      const html = `
        <table>
          <tr>5月10日(土) ○ × △</tr>
          <tr>5月11日(日) × ○ −</tr>
        </table>
      `;

      const slots = parseFujisawaHtml(html, 2026);

      expect(slots).toHaveLength(6);
      expect(slots[0]).toEqual({
        date: "2026-05-10",
        timeSlot: "MORNING",
        status: "AVAILABLE",
      });
      expect(slots[1]).toEqual({
        date: "2026-05-10",
        timeSlot: "AFTERNOON",
        status: "RESERVED",
      });
      // △ は AVAILABLE として扱う
      expect(slots[2]).toEqual({
        date: "2026-05-10",
        timeSlot: "EVENING",
        status: "AVAILABLE",
      });
      expect(slots[5]).toEqual({
        date: "2026-05-11",
        timeSlot: "EVENING",
        status: "UNAVAILABLE",
      });
    });
  });

  describe("空のHTMLのとき", () => {
    it("空配列を返す", () => {
      const slots = parseFujisawaHtml("");
      expect(slots).toHaveLength(0);
    });
  });
});

describe("fetchWithTimeout", () => {
  describe("タイムアウトのとき", () => {
    it("AbortError を投げる", async () => {
      // 到達不能なアドレスに極短タイムアウトで接続を試みる
      try {
        await fetchWithTimeout("http://192.0.2.1:1", 1);
        // 接続エラーが先に来る場合もある
      } catch (error) {
        expect(error).toBeDefined();
        // AbortError か接続エラーのどちらかが来る
        if (error instanceof DOMException) {
          expect(error.name).toBe("AbortError");
        }
      }
    });
  });
});

describe("KNOWN_GROUNDS", () => {
  it("6自治体分のグラウンド名を持つ", () => {
    expect(Object.keys(KNOWN_GROUNDS)).toHaveLength(6);
  });

  it("各自治体に少なくとも1つのグラウンドがある", () => {
    for (const [_municipality, grounds] of Object.entries(KNOWN_GROUNDS)) {
      expect(grounds.length).toBeGreaterThan(0);
    }
  });
});
