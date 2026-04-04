// ============================================================
// グラウンド監視サービス
// watch_active なグラウンドを定期チェックし、
// 新たに空きが見つかった場合に通知を発行する。
// ============================================================

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Ground, GroundSlot } from "../types/domain";
import type { ScrapedSlot } from "./ground-scraper";
import { scrapeGround } from "./ground-scraper";

// --- 空き検出 ---

export interface NewAvailability {
  groundId: string;
  groundName: string;
  date: string;
  timeSlot: "MORNING" | "AFTERNOON" | "EVENING";
}

/**
 * 前回と今回のスロットを比較し、新たに AVAILABLE になったスロットを検出する。
 * 前回存在しなかったスロットが AVAILABLE の場合も新規検出とみなす。
 */
export function detectNewAvailability(
  previousSlots: Pick<GroundSlot, "date" | "time_slot" | "status">[],
  currentSlots: ScrapedSlot[],
): ScrapedSlot[] {
  const prevMap = new Map<string, string>();
  for (const s of previousSlots) {
    prevMap.set(`${s.date}:${s.time_slot}`, s.status);
  }

  return currentSlots.filter((s) => {
    if (s.status !== "AVAILABLE") return false;
    const prevStatus = prevMap.get(`${s.date}:${s.timeSlot}`);
    // 前回 AVAILABLE でなかった or 前回記録がない → 新規空き
    return prevStatus !== "AVAILABLE";
  });
}

// --- チェック結果 ---

export interface GroundCheckResult {
  groundId: string;
  groundName: string;
  municipality: string;
  slotsScraped: number;
  newAvailabilities: NewAvailability[];
  error?: string;
}

export interface CheckGroundsResult {
  teamId: string;
  checkedAt: string;
  results: GroundCheckResult[];
  totalNewAvailabilities: number;
  notificationSent: boolean;
}

// --- メインサービス ---

/**
 * チームの watch_active なグラウンドをすべてチェックし、
 * 新しい空きを検出して ground_slots テーブルを更新する。
 */
export async function checkGrounds(
  supabase: SupabaseClient,
  teamId: string,
): Promise<CheckGroundsResult> {
  // 1. watch_active なグラウンドを取得
  const { data: grounds, error: groundsError } = await supabase
    .from("grounds")
    .select("*")
    .eq("team_id", teamId)
    .eq("watch_active", true);

  if (groundsError) {
    throw new Error(`グラウンド取得エラー: ${groundsError.message}`);
  }

  const results: GroundCheckResult[] = [];

  for (const ground of (grounds ?? []) as Ground[]) {
    try {
      const result = await checkSingleGround(supabase, ground);
      results.push(result);
    } catch (e) {
      results.push({
        groundId: ground.id,
        groundName: ground.name,
        municipality: ground.municipality,
        slotsScraped: 0,
        newAvailabilities: [],
        error: e instanceof Error ? e.message : String(e),
      });
    }
  }

  const totalNewAvailabilities = results.reduce(
    (sum, r) => sum + r.newAvailabilities.length,
    0,
  );

  // 3. 新しい空きがある場合に通知ログを挿入
  let notificationSent = false;
  if (totalNewAvailabilities > 0) {
    const lines = results
      .flatMap((r) =>
        r.newAvailabilities.map(
          (a) => `${r.groundName} ${a.date} ${a.timeSlot}`,
        ),
      )
      .slice(0, 10); // 最大10件

    const content = `グラウンド空き検出:\n${lines.join("\n")}`;

    const { error: notifError } = await supabase
      .from("notification_logs")
      .insert({
        team_id: teamId,
        game_id: null,
        recipient_type: "MEMBER",
        notification_type: "GROUND_ALERT",
        content,
      });

    notificationSent = !notifError;
    if (notifError) {
      console.error("通知ログ挿入エラー:", notifError);
    }
  }

  return {
    teamId,
    checkedAt: new Date().toISOString(),
    results,
    totalNewAvailabilities,
    notificationSent,
  };
}

/**
 * 単一グラウンドの空き状況をチェックし、ground_slots を更新する。
 */
async function checkSingleGround(
  supabase: SupabaseClient,
  ground: Ground,
): Promise<GroundCheckResult> {
  // スクレイピング実行
  const scrapedSlots = await scrapeGround(ground.municipality, ground.name);

  // 既存スロットを取得
  const { data: existingSlots, error: slotsError } = await supabase
    .from("ground_slots")
    .select("date, time_slot, status")
    .eq("ground_id", ground.id);

  if (slotsError) {
    throw new Error(`スロット取得エラー: ${slotsError.message}`);
  }

  // 新しい空きを検出
  const newSlots = detectNewAvailability(existingSlots ?? [], scrapedSlots);

  // ground_slots をアップサート (全スクレイピング結果)
  const upsertRows = scrapedSlots.map((s) => ({
    ground_id: ground.id,
    date: s.date,
    time_slot: s.timeSlot,
    status: s.status,
    detected_at: new Date().toISOString(),
  }));

  if (upsertRows.length > 0) {
    const { error: upsertError } = await supabase
      .from("ground_slots")
      .upsert(upsertRows, {
        onConflict: "ground_id,date,time_slot",
      });

    if (upsertError) {
      console.error("スロットupsertエラー:", upsertError);
    }
  }

  return {
    groundId: ground.id,
    groundName: ground.name,
    municipality: ground.municipality,
    slotsScraped: scrapedSlots.length,
    newAvailabilities: newSlots.map((s) => ({
      groundId: ground.id,
      groundName: ground.name,
      date: s.date,
      timeSlot: s.timeSlot,
    })),
  };
}
