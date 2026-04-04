// ============================================================
// Cron ガード — 冪等性保証ユーティリティ
// 同じcronジョブが重複実行されるのを防ぐ
// ============================================================

/** 実行記録 */
export interface CronExecutionRecord {
  jobName: string;
  executedAt: Date;
  key: string;
}

/**
 * 冪等キーを生成する
 * ジョブ名 + 時間枠で一意のキーを作成する
 *
 * @param jobName ジョブ名 (例: "send-reminders")
 * @param intervalMinutes 実行間隔 (分)
 * @param now 現在時刻
 */
export function generateIdempotencyKey(
  jobName: string,
  intervalMinutes: number,
  now: Date = new Date(),
): string {
  const slot = Math.floor(now.getTime() / (intervalMinutes * 60 * 1000));
  return `${jobName}:${slot}`;
}

/**
 * 同一時間枠内での重複実行を検出する
 */
export function isDuplicate(
  currentKey: string,
  previousKeys: string[],
): boolean {
  return previousKeys.includes(currentKey);
}

/** バッチ処理の結果 */
export interface BatchResult<T> {
  processed: T[];
  skipped: T[];
  errors: Array<{ item: T; error: string }>;
  totalProcessed: number;
  totalSkipped: number;
  totalErrors: number;
}

/**
 * バッチ処理を安全に実行する
 * 各アイテムのエラーを隔離し、1つの失敗が他に影響しないようにする
 */
export async function processBatch<T>(
  items: T[],
  processor: (item: T) => Promise<boolean>,
  shouldSkip?: (item: T) => boolean,
): Promise<BatchResult<T>> {
  const processed: T[] = [];
  const skipped: T[] = [];
  const errors: Array<{ item: T; error: string }> = [];

  for (const item of items) {
    if (shouldSkip?.(item)) {
      skipped.push(item);
      continue;
    }

    try {
      const success = await processor(item);
      if (success) {
        processed.push(item);
      } else {
        errors.push({ item, error: "処理が失敗しました" });
      }
    } catch (e) {
      errors.push({
        item,
        error: e instanceof Error ? e.message : "不明なエラー",
      });
    }
  }

  return {
    processed,
    skipped,
    errors,
    totalProcessed: processed.length,
    totalSkipped: skipped.length,
    totalErrors: errors.length,
  };
}
