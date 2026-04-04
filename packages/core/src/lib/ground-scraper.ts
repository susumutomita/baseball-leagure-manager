// ============================================================
// グラウンド空き状況スクレイパー — アダプターパターン
// 各自治体の予約システムをスクレイピングして空き状況を取得する。
// 現時点ではモックデータを返すスタブ実装。
// ============================================================

import { z } from "zod/v4";

// --- スクレイパー結果型 ---

export const TIME_SLOTS = ["MORNING", "AFTERNOON", "EVENING"] as const;
export type TimeSlot = (typeof TIME_SLOTS)[number];

export const SLOT_STATUSES = ["AVAILABLE", "RESERVED", "UNAVAILABLE"] as const;
export type SlotStatus = (typeof SLOT_STATUSES)[number];

export const scrapedSlotSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timeSlot: z.enum(TIME_SLOTS),
  status: z.enum(SLOT_STATUSES),
});

export type ScrapedSlot = z.infer<typeof scrapedSlotSchema>;

// --- アダプターインターフェース ---

export interface GroundScraperAdapter {
  /** 対応する自治体名 */
  readonly municipality: string;
  /** 指定グラウンド名の空き状況を取得する */
  scrape(groundName: string): Promise<ScrapedSlot[]>;
}

// --- モックデータ生成ヘルパー ---

/**
 * 2〜4週間先のリアルなモックスロットを生成する。
 * 土日はRESERVEDが多く、平日はAVAILABLEが多い傾向。
 */
export function generateMockSlots(
  seed: string,
  baseDate: Date = new Date(),
): ScrapedSlot[] {
  const slots: ScrapedSlot[] = [];
  // 簡易ハッシュでシード値を数値化
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) & 0x7fffffff;
  }

  for (let dayOffset = 14; dayOffset <= 28; dayOffset++) {
    const d = new Date(baseDate);
    d.setDate(d.getDate() + dayOffset);
    const dateStr = d.toISOString().slice(0, 10);
    const dayOfWeek = d.getDay(); // 0=日, 6=土
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    for (const timeSlot of TIME_SLOTS) {
      hash = (hash * 1103515245 + 12345) & 0x7fffffff;
      const roll = hash % 100;

      let status: SlotStatus;
      if (isWeekend) {
        // 週末: 70% RESERVED, 20% UNAVAILABLE, 10% AVAILABLE
        status =
          roll < 10 ? "AVAILABLE" : roll < 30 ? "UNAVAILABLE" : "RESERVED";
      } else {
        // 平日: 50% AVAILABLE, 30% RESERVED, 20% UNAVAILABLE
        status =
          roll < 50 ? "AVAILABLE" : roll < 80 ? "RESERVED" : "UNAVAILABLE";
      }

      slots.push({ date: dateStr, timeSlot, status });
    }
  }

  return slots;
}

// --- 自治体別スタブアダプター ---

function createStubAdapter(municipality: string): GroundScraperAdapter {
  return {
    municipality,
    async scrape(groundName: string): Promise<ScrapedSlot[]> {
      return generateMockSlots(`${municipality}:${groundName}`);
    },
  };
}

export const yokohamaAdapter: GroundScraperAdapter =
  createStubAdapter("横浜市");
export const fujisawaAdapter: GroundScraperAdapter =
  createStubAdapter("藤沢市");
export const hiratsukAdapter: GroundScraperAdapter =
  createStubAdapter("平塚市");
export const kamakuraAdapter: GroundScraperAdapter =
  createStubAdapter("鎌倉市");
export const kanagawaAdapter: GroundScraperAdapter =
  createStubAdapter("神奈川県");
export const ayaseAdapter: GroundScraperAdapter = createStubAdapter("綾瀬市");

// --- アダプターレジストリ ---

const ADAPTERS: ReadonlyMap<string, GroundScraperAdapter> = new Map([
  ["横浜市", yokohamaAdapter],
  ["藤沢市", fujisawaAdapter],
  ["平塚市", hiratsukAdapter],
  ["鎌倉市", kamakuraAdapter],
  ["神奈川県", kanagawaAdapter],
  ["綾瀬市", ayaseAdapter],
]);

/**
 * 自治体名からアダプターを取得する。
 * 未対応の自治体の場合は undefined を返す。
 */
export function getAdapter(
  municipality: string,
): GroundScraperAdapter | undefined {
  return ADAPTERS.get(municipality);
}

/**
 * 対応自治体の一覧を返す。
 */
export function getSupportedMunicipalities(): string[] {
  return [...ADAPTERS.keys()];
}

/**
 * 指定グラウンドの空き状況をスクレイピングする。
 * 未対応自治体の場合はエラーを投げる。
 */
export async function scrapeGround(
  municipality: string,
  groundName: string,
): Promise<ScrapedSlot[]> {
  const adapter = getAdapter(municipality);
  if (!adapter) {
    throw new Error(`未対応の自治体です: ${municipality}`);
  }
  const slots = await adapter.scrape(groundName);
  // バリデーション
  return slots.map((s) => scrapedSlotSchema.parse(s));
}
