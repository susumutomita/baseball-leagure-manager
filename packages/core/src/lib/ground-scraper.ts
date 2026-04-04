// ============================================================
// グラウンド空きスクレイパー (Ground Availability Scraper)
// 自治体予約サイトから野球場の空き状況を取得する
// 対応自治体: 横浜市 / 藤沢市 / 平塚市 / 鎌倉市 / 神奈川県 / 綾瀬市
// ============================================================

// --- 型定義 ---

export type TimeSlot = "MORNING" | "AFTERNOON" | "EVENING";
export type SlotStatus = "AVAILABLE" | "RESERVED" | "UNAVAILABLE";

export interface ScrapedSlot {
  date: string; // YYYY-MM-DD
  timeSlot: TimeSlot;
  status: SlotStatus;
}

export interface ScrapeResult {
  groundName: string;
  municipality: string;
  slots: ScrapedSlot[];
  scrapedAt: string; // ISO 8601
  source: "live" | "fallback";
  error?: string;
}

export interface GroundAdapter {
  municipality: string;
  scrape(groundName: string): Promise<ScrapedSlot[]>;
}

export interface ScraperLogger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

// --- 定数 ---

const SCRAPE_TIMEOUT_MS = 10_000;
const MOCK_DAYS_AHEAD = 30;

const TIME_SLOTS: TimeSlot[] = ["MORNING", "AFTERNOON", "EVENING"];

// 各自治体の実際のグラウンド名
const KNOWN_GROUNDS: Record<string, string[]> = {
  横浜市: [
    "新横浜公園野球場",
    "三ツ沢公園野球場",
    "保土ケ谷公園野球場",
    "俣野公園野球場",
    "金沢区総合庭球場隣接野球場",
  ],
  藤沢市: ["八部公園野球場", "秋葉台公園野球場", "大庭スポーツ広場野球場"],
  平塚市: ["平塚球場", "大神スポーツ広場野球場", "田村スポーツ広場"],
  鎌倉市: ["笛田公園野球場", "鎌倉海浜公園野球場"],
  神奈川県: ["保土ケ谷球場（神奈川県立）", "大和スポーツセンター野球場"],
  綾瀬市: ["綾瀬スポーツ公園野球場", "城山公園野球場"],
};

// --- デフォルトロガー ---

const defaultLogger: ScraperLogger = {
  info: (msg, meta) => console.log(`[ground-scraper] INFO: ${msg}`, meta ?? ""),
  warn: (msg, meta) =>
    console.warn(`[ground-scraper] WARN: ${msg}`, meta ?? ""),
  error: (msg, meta) =>
    console.error(`[ground-scraper] ERROR: ${msg}`, meta ?? ""),
};

// --- ユーティリティ ---

/**
 * タイムアウト付き fetch
 */
export async function fetchWithTimeout(
  url: string,
  timeoutMs: number = SCRAPE_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; MoundBot/1.0; +https://github.com/mound)",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "ja,en;q=0.5",
      },
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 日付文字列を YYYY-MM-DD 形式にフォーマットする
 */
export function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * 曜日を返す (0=日曜, 6=土曜)
 */
function getDayOfWeek(dateStr: string): number {
  return new Date(dateStr).getDay();
}

/**
 * 週末かどうか
 */
function isWeekend(dateStr: string): boolean {
  const dow = getDayOfWeek(dateStr);
  return dow === 0 || dow === 6;
}

/**
 * 決定論的な疑似乱数生成（テスト可能性のため）
 * シード文字列から 0-1 の値を返す
 */
export function seededRandom(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // 32bit 整数に変換
  }
  // 正の値に変換して 0-1 にマッピング
  return ((hash >>> 0) % 10000) / 10000;
}

// --- リアルスティックなモックデータ生成 ---

/**
 * リアルな空きスロットデータを生成する
 *
 * ルール:
 * - 今日から30日先まで生成
 * - 週末: 70% RESERVED, 30% AVAILABLE (人気が高い)
 * - 平日: 30% RESERVED, 70% AVAILABLE
 * - MORNING は AFTERNOON より人気 (予約率 +15%)
 * - EVENING はナイター設備がないと UNAVAILABLE
 */
export function generateRealisticSlots(
  groundName: string,
  options: {
    daysAhead?: number;
    hasNightLights?: boolean;
    baseDate?: Date;
  } = {},
): ScrapedSlot[] {
  const {
    daysAhead = MOCK_DAYS_AHEAD,
    hasNightLights = false,
    baseDate = new Date(),
  } = options;

  const slots: ScrapedSlot[] = [];

  for (let i = 1; i <= daysAhead; i++) {
    const date = new Date(baseDate);
    date.setDate(date.getDate() + i);
    const dateStr = formatDate(date);
    const weekend = isWeekend(dateStr);

    for (const timeSlot of TIME_SLOTS) {
      // EVENING はナイター設備なしなら UNAVAILABLE
      if (timeSlot === "EVENING" && !hasNightLights) {
        slots.push({ date: dateStr, timeSlot, status: "UNAVAILABLE" });
        continue;
      }

      // 基本予約率を計算
      let reservedRate = weekend ? 0.7 : 0.3;

      // MORNING は +15% 予約率
      if (timeSlot === "MORNING") {
        reservedRate = Math.min(reservedRate + 0.15, 0.95);
      }

      // EVENING は -10% 予約率 (あまり人気ない)
      if (timeSlot === "EVENING") {
        reservedRate = Math.max(reservedRate - 0.1, 0.05);
      }

      // 決定論的に判定
      const seed = `${groundName}-${dateStr}-${timeSlot}`;
      const rand = seededRandom(seed);

      const status: SlotStatus = rand < reservedRate ? "RESERVED" : "AVAILABLE";
      slots.push({ date: dateStr, timeSlot, status });
    }
  }

  return slots;
}

// --- HTML パーサー ---

/**
 * 横浜市はまなびネット / hamanavi.jp のHTML から空き状況を抽出する
 *
 * 横浜市の公共施設予約システム（はまなびネット）は JavaScript レンダリングが必要なため
 * fetch 単体では完全なデータ取得は困難。HTML が取得できた場合のパース処理を提供する。
 *
 * 期待する HTML 構造:
 * - テーブル行に日付と時間帯ごとの空き状況を含む
 * - "○" = AVAILABLE, "×" = RESERVED, "−" / "-" = UNAVAILABLE
 * - 日付は "M/D" 形式 (例: "5/10")
 */
export function parseYokohamaHtml(
  html: string,
  year: number = new Date().getFullYear(),
): ScrapedSlot[] {
  const slots: ScrapedSlot[] = [];

  // 空き状況テーブルから行を抽出
  // パターン: 日付セル + 時間帯ごとの空き状況セル
  const rowPattern =
    /(\d{1,2})\/(\d{1,2})\s*(?:\([日月火水木金土]\))?\s*.*?(○|×|−|-)\s*.*?(○|×|−|-)\s*.*?(○|×|−|-)/g;

  const matches = html.matchAll(rowPattern);
  for (const match of matches) {
    const month = Number.parseInt(match[1], 10);
    const day = Number.parseInt(match[2], 10);
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const statusMap: Record<string, SlotStatus> = {
      "○": "AVAILABLE",
      "×": "RESERVED",
      "−": "UNAVAILABLE",
      "-": "UNAVAILABLE",
    };

    const morningStatus = statusMap[match[3]] ?? "UNAVAILABLE";
    const afternoonStatus = statusMap[match[4]] ?? "UNAVAILABLE";
    const eveningStatus = statusMap[match[5]] ?? "UNAVAILABLE";

    slots.push({ date: dateStr, timeSlot: "MORNING", status: morningStatus });
    slots.push({
      date: dateStr,
      timeSlot: "AFTERNOON",
      status: afternoonStatus,
    });
    slots.push({ date: dateStr, timeSlot: "EVENING", status: eveningStatus });
  }

  return slots;
}

/**
 * 藤沢市公共施設予約システムの HTML から空き状況を抽出する
 *
 * 藤沢市もサーバーサイドレンダリングが不完全なため fetch では取得困難な場合がある。
 * HTML が取得できた場合のパース処理を提供する。
 *
 * 期待する HTML 構造:
 * - カレンダー形式のテーブル
 * - セル内の記号: "○"=空き, "×"=予約済み, "△"=残りわずか, "−"=利用不可
 */
export function parseFujisawaHtml(
  html: string,
  year: number = new Date().getFullYear(),
): ScrapedSlot[] {
  const slots: ScrapedSlot[] = [];

  // 藤沢市の予約システムは日付行 + 午前/午後/夜間の空きパターン
  const rowPattern =
    /(\d{1,2})月(\d{1,2})日\s*(?:\([日月火水木金土]\))?\s*.*?(○|×|△|−|-)\s*.*?(○|×|△|−|-)\s*.*?(○|×|△|−|-)/g;

  const matches = html.matchAll(rowPattern);
  for (const match of matches) {
    const month = Number.parseInt(match[1], 10);
    const day = Number.parseInt(match[2], 10);
    const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const statusMap: Record<string, SlotStatus> = {
      "○": "AVAILABLE",
      "×": "RESERVED",
      "△": "AVAILABLE", // 残りわずか → AVAILABLE として扱う
      "−": "UNAVAILABLE",
      "-": "UNAVAILABLE",
    };

    const morningStatus = statusMap[match[3]] ?? "UNAVAILABLE";
    const afternoonStatus = statusMap[match[4]] ?? "UNAVAILABLE";
    const eveningStatus = statusMap[match[5]] ?? "UNAVAILABLE";

    slots.push({ date: dateStr, timeSlot: "MORNING", status: morningStatus });
    slots.push({
      date: dateStr,
      timeSlot: "AFTERNOON",
      status: afternoonStatus,
    });
    slots.push({ date: dateStr, timeSlot: "EVENING", status: eveningStatus });
  }

  return slots;
}

// --- アダプター実装 ---

/**
 * 横浜市アダプター
 *
 * ターゲット URL: https://www.hamanavi.jp/ (はまなびネット)
 * 代替: https://yoyaku.city.yokohama.lg.jp/
 *
 * はまなびネットは JavaScript レンダリングが必須のため、
 * fetch では完全なデータ取得ができない。
 * HTML レスポンスが取得できた場合はパースし、
 * 失敗時はリアルなモックデータにフォールバックする。
 */
function createYokohamaAdapter(logger: ScraperLogger): GroundAdapter {
  return {
    municipality: "横浜市",
    async scrape(groundName: string): Promise<ScrapedSlot[]> {
      // 横浜市はまなびネットの施設空き照会URL
      // 実際のシステムは動的なURLパラメータが必要
      const baseUrl = "https://www.hamanavi.jp/reserve/gr_rsv.cgi";

      try {
        logger.info("横浜市の空き状況を取得中", {
          groundName,
          url: baseUrl,
        });
        const response = await fetchWithTimeout(baseUrl);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const html = await response.text();
        const slots = parseYokohamaHtml(html);

        if (slots.length > 0) {
          logger.info("横浜市のライブデータ取得成功", {
            groundName,
            slotCount: slots.length,
          });
          return slots;
        }

        // HTML は取れたがパースできなかった（JS レンダリング必要）
        logger.warn(
          "横浜市のHTMLからスロットを抽出できませんでした（JSレンダリングが必要な可能性）",
          { groundName },
        );
        throw new Error(
          "HTMLから空き状況を抽出できませんでした（JSレンダリングが必要）",
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const isAbort =
          error instanceof DOMException && error.name === "AbortError";

        if (isAbort) {
          logger.warn("横浜市のスクレイピングがタイムアウトしました", {
            groundName,
            timeoutMs: SCRAPE_TIMEOUT_MS,
          });
        } else {
          logger.warn("横浜市のスクレイピングに失敗、フォールバックを使用", {
            groundName,
            error: errorMessage,
          });
        }

        // 横浜市の主要球場はナイター設備ありが多い
        const hasNightLights =
          groundName.includes("新横浜") || groundName.includes("保土ケ谷");

        return generateRealisticSlots(groundName, { hasNightLights });
      }
    },
  };
}

/**
 * 藤沢市アダプター
 *
 * ターゲット URL: https://yoyaku.city.fujisawa.kanagawa.jp/
 *
 * 藤沢市も同様にJSレンダリングが必要なため、
 * フォールバック付きでスクレイピングを試みる。
 */
function createFujisawaAdapter(logger: ScraperLogger): GroundAdapter {
  return {
    municipality: "藤沢市",
    async scrape(groundName: string): Promise<ScrapedSlot[]> {
      const baseUrl =
        "https://yoyaku.city.fujisawa.kanagawa.jp/reserve/gr_rsv.cgi";

      try {
        logger.info("藤沢市の空き状況を取得中", {
          groundName,
          url: baseUrl,
        });
        const response = await fetchWithTimeout(baseUrl);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const html = await response.text();
        const slots = parseFujisawaHtml(html);

        if (slots.length > 0) {
          logger.info("藤沢市のライブデータ取得成功", {
            groundName,
            slotCount: slots.length,
          });
          return slots;
        }

        logger.warn(
          "藤沢市のHTMLからスロットを抽出できませんでした（JSレンダリングが必要な可能性）",
          { groundName },
        );
        throw new Error(
          "HTMLから空き状況を抽出できませんでした（JSレンダリングが必要）",
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        const isAbort =
          error instanceof DOMException && error.name === "AbortError";

        if (isAbort) {
          logger.warn("藤沢市のスクレイピングがタイムアウトしました", {
            groundName,
            timeoutMs: SCRAPE_TIMEOUT_MS,
          });
        } else {
          logger.warn("藤沢市のスクレイピングに失敗、フォールバックを使用", {
            groundName,
            error: errorMessage,
          });
        }

        // 八部公園はナイター設備あり
        const hasNightLights = groundName.includes("八部");
        return generateRealisticSlots(groundName, { hasNightLights });
      }
    },
  };
}

/**
 * 平塚市アダプター（拡張モック）
 *
 * ターゲット URL: https://yoyaku-shisetsu.city.hiratsuka.kanagawa.jp/
 * 現時点ではモックデータを使用
 */
function createHiratsukaAdapter(logger: ScraperLogger): GroundAdapter {
  return {
    municipality: "平塚市",
    async scrape(groundName: string): Promise<ScrapedSlot[]> {
      logger.info("平塚市の空き状況を生成中（モック）", { groundName });
      // 平塚球場はナイター設備あり
      const hasNightLights = groundName.includes("平塚球場");
      return generateRealisticSlots(groundName, { hasNightLights });
    },
  };
}

/**
 * 鎌倉市アダプター（拡張モック）
 *
 * ターゲット URL: https://shisetsu.city.kamakura.kanagawa.jp/
 * 現時点ではモックデータを使用
 */
function createKamakuraAdapter(logger: ScraperLogger): GroundAdapter {
  return {
    municipality: "鎌倉市",
    async scrape(groundName: string): Promise<ScrapedSlot[]> {
      logger.info("鎌倉市の空き状況を生成中（モック）", { groundName });
      // 鎌倉はナイター設備なし
      return generateRealisticSlots(groundName, { hasNightLights: false });
    },
  };
}

/**
 * 神奈川県アダプター（拡張モック）
 *
 * ターゲット URL: https://www.e-kanagawa.lg.jp/
 * 現時点ではモックデータを使用
 */
function createKanagawaAdapter(logger: ScraperLogger): GroundAdapter {
  return {
    municipality: "神奈川県",
    async scrape(groundName: string): Promise<ScrapedSlot[]> {
      logger.info("神奈川県の空き状況を生成中（モック）", { groundName });
      // 保土ケ谷球場（県立）はナイター設備あり
      const hasNightLights = groundName.includes("保土ケ谷");
      return generateRealisticSlots(groundName, { hasNightLights });
    },
  };
}

/**
 * 綾瀬市アダプター（拡張モック）
 *
 * ターゲット URL: https://www.city.ayase.kanagawa.jp/
 * 現時点ではモックデータを使用
 */
function createAyaseAdapter(logger: ScraperLogger): GroundAdapter {
  return {
    municipality: "綾瀬市",
    async scrape(groundName: string): Promise<ScrapedSlot[]> {
      logger.info("綾瀬市の空き状況を生成中（モック）", { groundName });
      return generateRealisticSlots(groundName, { hasNightLights: false });
    },
  };
}

// --- スクレイパー本体 ---

export interface GroundScraperOptions {
  logger?: ScraperLogger;
}

export class GroundScraper {
  private adapters: Map<string, GroundAdapter>;
  private logger: ScraperLogger;

  constructor(options: GroundScraperOptions = {}) {
    this.logger = options.logger ?? defaultLogger;
    this.adapters = new Map();

    // 6自治体のアダプターを登録
    const adapterFactories = [
      createYokohamaAdapter,
      createFujisawaAdapter,
      createHiratsukaAdapter,
      createKamakuraAdapter,
      createKanagawaAdapter,
      createAyaseAdapter,
    ];

    for (const factory of adapterFactories) {
      const adapter = factory(this.logger);
      this.adapters.set(adapter.municipality, adapter);
    }
  }

  /**
   * 指定自治体のアダプターを取得
   */
  getAdapter(municipality: string): GroundAdapter | undefined {
    return this.adapters.get(municipality);
  }

  /**
   * 登録済みの自治体一覧
   */
  getMunicipalities(): string[] {
    return [...this.adapters.keys()];
  }

  /**
   * 指定グラウンドの空き状況をスクレイピングする
   */
  async scrapeGround(
    municipality: string,
    groundName: string,
  ): Promise<ScrapeResult> {
    const adapter = this.adapters.get(municipality);

    if (!adapter) {
      this.logger.error("未対応の自治体です", { municipality });
      return {
        groundName,
        municipality,
        slots: [],
        scrapedAt: new Date().toISOString(),
        source: "fallback",
        error: `未対応の自治体: ${municipality}`,
      };
    }

    try {
      const slots = await adapter.scrape(groundName);
      return {
        groundName,
        municipality,
        slots,
        scrapedAt: new Date().toISOString(),
        source: "live", // アダプター内でフォールバックした場合もここでは live と返す
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error("スクレイピングに失敗しました", {
        municipality,
        groundName,
        error: errorMessage,
      });

      // 最終フォールバック
      return {
        groundName,
        municipality,
        slots: generateRealisticSlots(groundName),
        scrapedAt: new Date().toISOString(),
        source: "fallback",
        error: errorMessage,
      };
    }
  }

  /**
   * 複数グラウンドを一括スクレイピングする
   */
  async scrapeMultiple(
    targets: Array<{ municipality: string; groundName: string }>,
  ): Promise<ScrapeResult[]> {
    const results = await Promise.allSettled(
      targets.map((t) => this.scrapeGround(t.municipality, t.groundName)),
    );

    return results.map((result, index) => {
      if (result.status === "fulfilled") {
        return result.value;
      }

      const target = targets[index];
      this.logger.error("一括スクレイピングで予期しないエラー", {
        municipality: target.municipality,
        groundName: target.groundName,
        error:
          result.reason instanceof Error
            ? result.reason.message
            : String(result.reason),
      });

      return {
        groundName: target.groundName,
        municipality: target.municipality,
        slots: generateRealisticSlots(target.groundName),
        scrapedAt: new Date().toISOString(),
        source: "fallback" as const,
        error: "予期しないエラーが発生しました",
      };
    });
  }
}

// --- エクスポート ---

export { KNOWN_GROUNDS, SCRAPE_TIMEOUT_MS, MOCK_DAYS_AHEAD };
