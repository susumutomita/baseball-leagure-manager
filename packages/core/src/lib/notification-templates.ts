// ============================================================
// 通知テンプレートビルダー — 各種通知メッセージのテンプレート生成
// ============================================================
import type { Game, Settlement } from "../types/domain";

export type TemplateType =
  | "RSVP_REQUEST"
  | "RSVP_REMINDER"
  | "GAME_CONFIRMED"
  | "GAME_CANCELLED"
  | "SETTLEMENT_REQUEST"
  | "HELPER_REQUEST"
  | "DEADLINE_WARNING";

/**
 * 出欠依頼メッセージを生成する
 */
export function buildRsvpRequestMessage(
  game: Game,
  teamName: string,
  rsvpUrl: string,
): string {
  const dateStr = game.game_date ?? "日程未定";
  const timeStr = game.start_time ? ` ${game.start_time}〜` : "";
  const groundStr = game.ground_name ? `\n会場: ${game.ground_name}` : "";
  const deadlineStr = game.rsvp_deadline
    ? `\n回答期限: ${formatDeadline(game.rsvp_deadline)}`
    : "";

  return `【出欠確認】${teamName}
${game.title}
日時: ${dateStr}${timeStr}${groundStr}${deadlineStr}

出欠を回答してください:
${rsvpUrl}`;
}

/**
 * 出欠リマインダーメッセージを生成する
 */
export function buildRsvpReminderMessage(
  game: Game,
  teamName: string,
  noResponseCount: number,
  rsvpUrl: string,
): string {
  const dateStr = game.game_date ?? "日程未定";
  const deadlineStr = game.rsvp_deadline
    ? formatDeadline(game.rsvp_deadline)
    : "未設定";

  return `【リマインダー】${teamName}
${game.title} (${dateStr})

まだ${noResponseCount}人が未回答です。
回答期限: ${deadlineStr}

出欠を回答してください:
${rsvpUrl}`;
}

/**
 * 試合確定メッセージを生成する
 */
export function buildGameConfirmedMessage(
  game: Game,
  teamName: string,
  availableCount: number,
): string {
  const dateStr = game.game_date ?? "日程未定";
  const timeStr =
    game.start_time && game.end_time
      ? ` ${game.start_time}〜${game.end_time}`
      : game.start_time
        ? ` ${game.start_time}〜`
        : "";
  const groundStr = game.ground_name ?? "未定";

  return `【試合確定】${teamName}
${game.title}

日時: ${dateStr}${timeStr}
会場: ${groundStr}
参加者: ${availableCount}人

よろしくお願いいたします！`;
}

/**
 * 試合中止メッセージを生成する
 */
export function buildGameCancelledMessage(
  game: Game,
  teamName: string,
  reason?: string,
): string {
  const dateStr = game.game_date ?? "日程未定";
  const reasonStr = reason ? `\n理由: ${reason}` : "";

  return `【試合中止】${teamName}
${game.title} (${dateStr})

この試合は中止となりました。${reasonStr}

ご理解のほどよろしくお願いいたします。`;
}

/**
 * 精算依頼メッセージを生成する
 */
export function buildSettlementMessage(
  game: Game,
  settlement: Pick<Settlement, "per_member" | "team_cost">,
  paymentUrl?: string,
): string {
  const dateStr = game.game_date ?? "";
  const paymentStr = paymentUrl ? `\n\nお支払いはこちら:\n${paymentUrl}` : "";

  return `【精算のお知らせ】
${game.title} (${dateStr})

お一人あたり: ${settlement.per_member.toLocaleString()}円
チーム負担合計: ${settlement.team_cost.toLocaleString()}円${paymentStr}

お支払いをお願いいたします。`;
}

/**
 * 締切警告メッセージを生成する
 */
export function buildDeadlineWarningMessage(
  game: Game,
  hoursLeft: number,
  noResponseCount: number,
): string {
  const timeStr =
    hoursLeft >= 24
      ? `${Math.floor(hoursLeft / 24)}日`
      : `${Math.round(hoursLeft)}時間`;

  return `【締切間近】${game.title}
出欠回答の締切まであと${timeStr}です。
未回答: ${noResponseCount}人

お早めに回答をお願いします。`;
}

function formatDeadline(deadline: string): string {
  const d = new Date(deadline);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}
