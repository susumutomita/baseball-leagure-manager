// ============================================================
// 試合日ユーティリティ — 日程に関する判定・フォーマット関数群
// ============================================================
import type { Game } from "../types/domain";

/** 試合日までの残り日数を計算する */
export function daysUntilGame(
  game: Game,
  now: Date = new Date(),
): number | null {
  if (!game.game_date) return null;
  const gameDate = new Date(game.game_date);
  const diffMs = gameDate.getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

/** 試合日が今日かどうか判定する */
export function isGameDay(game: Game, now: Date = new Date()): boolean {
  if (!game.game_date) return false;
  const gameDate = new Date(game.game_date);
  return (
    gameDate.getFullYear() === now.getFullYear() &&
    gameDate.getMonth() === now.getMonth() &&
    gameDate.getDate() === now.getDate()
  );
}

/** 試合日が過去かどうか判定する */
export function isGamePast(game: Game, now: Date = new Date()): boolean {
  if (!game.game_date) return false;
  const gameDate = new Date(game.game_date);
  gameDate.setHours(23, 59, 59, 999);
  return gameDate < now;
}

/** 試合日が未来かどうか判定する */
export function isGameFuture(game: Game, now: Date = new Date()): boolean {
  if (!game.game_date) return false;
  const gameDate = new Date(game.game_date);
  gameDate.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  return gameDate > today;
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

/** 試合スケジュールをフォーマットする */
export function formatGameSchedule(game: Game): string {
  if (!game.game_date) return "日程未定";

  const date = new Date(game.game_date);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const weekday = WEEKDAYS[date.getDay()];
  let result = `${month}/${day}(${weekday})`;

  if (game.start_time) {
    result += ` ${game.start_time}`;
    if (game.end_time) {
      result += `〜${game.end_time}`;
    }
  }

  return result;
}

/** 試合一覧を日付順にソートする (未定の日程は最後) */
export function sortGamesByDate(games: Game[], ascending = true): Game[] {
  return [...games].sort((a, b) => {
    if (!a.game_date && !b.game_date) return 0;
    if (!a.game_date) return 1;
    if (!b.game_date) return -1;
    const diff =
      new Date(a.game_date).getTime() - new Date(b.game_date).getTime();
    return ascending ? diff : -diff;
  });
}

/** 指定期間内の試合をフィルタする */
export function filterGamesByDateRange(
  games: Game[],
  startDate: Date,
  endDate: Date,
): Game[] {
  return games.filter((game) => {
    if (!game.game_date) return false;
    const date = new Date(game.game_date);
    return date >= startDate && date <= endDate;
  });
}

/** 今週の試合を取得する */
export function getThisWeekGames(
  games: Game[],
  now: Date = new Date(),
): Game[] {
  const startOfWeek = new Date(now);
  const day = startOfWeek.getDay();
  startOfWeek.setDate(startOfWeek.getDate() - day);
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  return filterGamesByDateRange(games, startOfWeek, endOfWeek);
}
