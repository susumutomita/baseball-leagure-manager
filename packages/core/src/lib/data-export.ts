// ============================================================
// データエクスポートユーティリティ — CSV 形式でのデータ出力
// ============================================================
import type { Game, Member, Rsvp } from "../types/domain";

/**
 * 配列データをCSV文字列に変換する
 */
export function toCSV(headers: string[], rows: string[][]): string {
  const headerLine = headers.map(escapeCSV).join(",");
  const dataLines = rows.map((row) => row.map(escapeCSV).join(","));
  return [headerLine, ...dataLines].join("\n");
}

function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * 試合一覧をCSVにエクスポートする
 */
export function exportGamesToCSV(games: Game[]): string {
  const headers = [
    "ID",
    "タイトル",
    "種別",
    "ステータス",
    "試合日",
    "開始時刻",
    "終了時刻",
    "グラウンド",
    "最低人数",
    "参加可能",
    "不参加",
    "未定",
    "未回答",
  ];

  const rows = games.map((g) => [
    g.id,
    g.title,
    g.game_type,
    g.status,
    g.game_date ?? "",
    g.start_time ?? "",
    g.end_time ?? "",
    g.ground_name ?? "",
    String(g.min_players),
    String(g.available_count),
    String(g.unavailable_count),
    String(g.maybe_count),
    String(g.no_response_count),
  ]);

  return toCSV(headers, rows);
}

/**
 * メンバー一覧をCSVにエクスポートする
 */
export function exportMembersToCSV(members: Member[]): string {
  const headers = [
    "ID",
    "名前",
    "区分",
    "役割",
    "ステータス",
    "ポジション",
    "背番号",
    "出席率",
    "無断欠席率",
    "LINE連携",
    "メール",
  ];

  const rows = members.map((m) => [
    m.id,
    m.name,
    m.tier,
    m.role,
    m.status,
    (m.positions_json ?? []).join("/"),
    m.jersey_number != null ? String(m.jersey_number) : "",
    `${Math.round(m.attendance_rate * 100)}%`,
    `${Math.round(m.no_show_rate * 100)}%`,
    m.line_user_id ? "済" : "未",
    m.email ?? "",
  ]);

  return toCSV(headers, rows);
}

/**
 * 出欠一覧をCSVにエクスポートする
 */
export function exportRsvpsToCSV(
  rsvps: Rsvp[],
  memberNames: Map<string, string>,
): string {
  const headers = ["メンバーID", "メンバー名", "回答", "回答日時", "チャネル"];

  const rows = rsvps.map((r) => [
    r.member_id,
    memberNames.get(r.member_id) ?? "不明",
    translateResponse(r.response),
    r.responded_at ?? "",
    r.response_channel ?? "",
  ]);

  return toCSV(headers, rows);
}

function translateResponse(response: string): string {
  switch (response) {
    case "AVAILABLE":
      return "参加";
    case "UNAVAILABLE":
      return "不参加";
    case "MAYBE":
      return "未定";
    case "NO_RESPONSE":
      return "未回答";
    default:
      return response;
  }
}
