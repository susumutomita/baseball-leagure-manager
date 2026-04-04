/**
 * Cron ジョブのコアロジック
 *
 * Web レイヤー (Next.js API routes) から分離したテスト可能な純粋関数群。
 * DB アクセスを持たず、フィルタリングと判定のみを行う。
 */

import type { Game } from "../types/domain";

/** リマインダー対象判定に必要な最小限の Game 情報 */
export type CronGameInput = Pick<Game, "id" | "status" | "rsvp_deadline">;

/** デフォルトのリマインダーウィンドウ (48時間) */
const DEFAULT_REMINDER_WINDOW_MS = 48 * 60 * 60 * 1000;

/**
 * リマインダー送信が必要なゲームを抽出する。
 *
 * 条件:
 * - status が COLLECTING
 * - rsvp_deadline が設定されている
 * - rsvp_deadline がまだ過ぎていない
 * - rsvp_deadline が now から reminderWindowMs 以内
 */
export function findGamesNeedingReminder(
  games: CronGameInput[],
  now: Date,
  reminderWindowMs: number = DEFAULT_REMINDER_WINDOW_MS,
): CronGameInput[] {
  return games.filter((game) =>
    shouldSendReminder(game, now, reminderWindowMs),
  );
}

/**
 * 締切を過ぎたゲームを抽出する。
 *
 * 条件:
 * - status が COLLECTING
 * - rsvp_deadline が設定されている
 * - rsvp_deadline が now より前
 */
export function findGamesPassedDeadline(
  games: CronGameInput[],
  now: Date,
): CronGameInput[] {
  return games.filter((game) => {
    if (game.status !== "COLLECTING") return false;
    if (!game.rsvp_deadline) return false;
    return new Date(game.rsvp_deadline) <= now;
  });
}

/**
 * 特定のゲームがリマインダー送信対象かどうかを判定する。
 *
 * @returns true: リマインダーが必要, false: 不要
 */
export function shouldSendReminder(
  game: CronGameInput,
  now: Date,
  reminderWindowMs: number = DEFAULT_REMINDER_WINDOW_MS,
): boolean {
  if (game.status !== "COLLECTING") return false;
  if (!game.rsvp_deadline) return false;

  const deadline = new Date(game.rsvp_deadline);

  // 既に締切を過ぎている → リマインダーではなくデッドライン処理が必要
  if (deadline <= now) return false;

  // 締切までの残り時間がウィンドウ内か
  const timeUntilDeadline = deadline.getTime() - now.getTime();
  return timeUntilDeadline <= reminderWindowMs;
}
