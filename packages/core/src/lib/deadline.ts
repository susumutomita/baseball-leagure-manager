// ============================================================
// 締切管理ユーティリティ
// RSVP 締切の判定・自動処理ロジック
// ============================================================
import type { Game, Rsvp } from "../types/domain";

/** 締切チェック結果 */
export interface DeadlineCheckResult {
  /** 締切を過ぎているか */
  isPastDeadline: boolean;
  /** 締切までの残り時間 (ms)。過ぎている場合は負の値 */
  remainingMs: number;
  /** 未回答メンバーのID一覧 */
  noResponseMemberIds: string[];
  /** 回答率 (0〜1) */
  responseRate: number;
}

/**
 * 試合の RSVP 締切状況をチェックする
 */
export function checkDeadline(
  game: Game,
  rsvps: Rsvp[],
  now: Date = new Date(),
): DeadlineCheckResult {
  const noResponseMemberIds = rsvps
    .filter((r) => r.response === "NO_RESPONSE")
    .map((r) => r.member_id);

  const totalRsvps = rsvps.length;
  const responded = totalRsvps - noResponseMemberIds.length;
  const responseRate = totalRsvps > 0 ? responded / totalRsvps : 0;

  if (!game.rsvp_deadline) {
    return {
      isPastDeadline: false,
      remainingMs: Number.POSITIVE_INFINITY,
      noResponseMemberIds,
      responseRate,
    };
  }

  const deadline = new Date(game.rsvp_deadline);
  const remainingMs = deadline.getTime() - now.getTime();

  return {
    isPastDeadline: remainingMs <= 0,
    remainingMs,
    noResponseMemberIds,
    responseRate,
  };
}

/** リマインダー判定の入力 */
export interface ReminderCheckInput {
  game: Game;
  rsvps: Rsvp[];
  reminderHoursBefore: number[];
  now?: Date;
}

/** どのタイミングのリマインダーを送るべきか判定 */
export interface ReminderCheckResult {
  shouldSend: boolean;
  hoursBeforeDeadline: number | null;
  noResponseMemberIds: string[];
}

/**
 * リマインダーを送信すべきか判定する
 *
 * reminderHoursBefore の各時間について、現在時刻が
 * 「締切 - N時間」の前後1時間以内であればリマインダー対象とする
 */
export function shouldSendReminder(
  input: ReminderCheckInput,
): ReminderCheckResult {
  const { game, rsvps, reminderHoursBefore, now = new Date() } = input;

  const noResponseMemberIds = rsvps
    .filter((r) => r.response === "NO_RESPONSE")
    .map((r) => r.member_id);

  if (!game.rsvp_deadline || noResponseMemberIds.length === 0) {
    return {
      shouldSend: false,
      hoursBeforeDeadline: null,
      noResponseMemberIds,
    };
  }

  const deadline = new Date(game.rsvp_deadline);
  const hoursToDeadline =
    (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);

  // 締切を過ぎている場合はリマインダー不要
  if (hoursToDeadline <= 0) {
    return {
      shouldSend: false,
      hoursBeforeDeadline: null,
      noResponseMemberIds,
    };
  }

  // 各リマインダータイミングをチェック (前後1時間の範囲)
  for (const hours of reminderHoursBefore.sort((a, b) => b - a)) {
    if (hoursToDeadline <= hours + 0.5 && hoursToDeadline >= hours - 0.5) {
      return {
        shouldSend: true,
        hoursBeforeDeadline: hours,
        noResponseMemberIds,
      };
    }
  }

  return { shouldSend: false, hoursBeforeDeadline: null, noResponseMemberIds };
}

/**
 * 締切超過した試合の一覧をフィルタする
 */
export function filterExpiredGames(
  games: Game[],
  now: Date = new Date(),
): Game[] {
  return games.filter((game) => {
    if (!game.rsvp_deadline) return false;
    if (game.status !== "COLLECTING") return false;
    return new Date(game.rsvp_deadline) <= now;
  });
}
