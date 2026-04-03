// ============================================================
// iCalendar (RFC 5545) フィード生成
// ============================================================

import type { Game, GameStatus } from "../types/domain";

/**
 * Game の status を iCalendar の STATUS プロパティにマッピングする。
 */
function mapGameStatusToIcalStatus(status: GameStatus): string {
  switch (status) {
    case "CONFIRMED":
    case "COMPLETED":
    case "SETTLED":
      return "CONFIRMED";
    default:
      return "TENTATIVE";
  }
}

/**
 * 日付文字列 "YYYY-MM-DD" と時刻文字列 "HH:mm" を iCalendar の
 * DATETIME 形式 "YYYYMMDDTHHmmss" に変換する。
 */
function formatDateTime(date: string, time: string): string {
  const d = date.replace(/-/g, "");
  const t = `${time.replace(/:/g, "")}00`;
  return `${d}T${t}`;
}

/**
 * 日付文字列 "YYYY-MM-DD" を iCalendar の DATE 形式 "YYYYMMDD" に変換する。
 */
function formatDate(date: string): string {
  return date.replace(/-/g, "");
}

/**
 * iCalendar のテキスト値をエスケープする (RFC 5545 Section 3.3.11)。
 */
function escapeText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/**
 * 1つの Game に対応する VEVENT ブロックを生成する。
 */
export function generateVEvent(game: Game): string {
  const lines: string[] = [];
  lines.push("BEGIN:VEVENT");
  lines.push(`UID:${game.id}`);

  const gameDate = game.game_date!;
  const hasTime = game.start_time !== null;

  if (hasTime) {
    const startTime = game.start_time ?? "09:00";
    const endTime = game.end_time ?? "12:00";
    lines.push(`DTSTART:${formatDateTime(gameDate, startTime)}`);
    lines.push(`DTEND:${formatDateTime(gameDate, endTime)}`);
  } else {
    lines.push(`DTSTART;VALUE=DATE:${formatDate(gameDate)}`);
    lines.push(`DTEND;VALUE=DATE:${formatDate(gameDate)}`);
  }

  lines.push(`SUMMARY:${escapeText(game.title)}`);

  if (game.ground_name) {
    lines.push(`LOCATION:${escapeText(game.ground_name)}`);
  }

  lines.push(`STATUS:${mapGameStatusToIcalStatus(game.status)}`);
  lines.push("END:VEVENT");

  return lines.join("\r\n");
}

/**
 * Game 配列から iCalendar フィード全体を生成する。
 */
export function generateICalFeed(games: Game[], calendarName: string): string {
  const lines: string[] = [];
  lines.push("BEGIN:VCALENDAR");
  lines.push("VERSION:2.0");
  lines.push("PRODID:-//match-engine//mound//JP");
  lines.push(`X-WR-CALNAME:${escapeText(calendarName)}`);

  for (const game of games) {
    lines.push(generateVEvent(game));
  }

  lines.push("END:VCALENDAR");

  return `${lines.join("\r\n")}\r\n`;
}
