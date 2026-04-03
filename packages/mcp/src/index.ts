#!/usr/bin/env bun
// ============================================================
// Mound MCP Server — 草野球試合成立エンジンの MCP インターフェース
// ============================================================

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod/v4";
import { get, patch, post } from "./api-client";

const server = new McpServer({
  name: "mound",
  version: "0.1.0",
});

// ============================================================
// ヘルパー: API レスポンスを MCP ツール結果に変換
// ============================================================

function toResult(res: { ok: boolean; status: number; data: unknown }) {
  return {
    content: [
      {
        type: "text" as const,
        text: JSON.stringify(res.data, null, 2),
      },
    ],
    isError: !res.ok,
  };
}

// ============================================================
// 試合ライフサイクル (5 tools)
// ============================================================

server.tool(
  "create_game",
  "試合を新規作成する。DRAFT 状態で作成される。",
  {
    team_id: z.string().uuid().describe("チーム ID"),
    title: z.string().min(1).max(200).describe("試合タイトル"),
    game_type: z
      .enum(["PRACTICE", "FRIENDLY", "LEAGUE", "TOURNAMENT"])
      .default("FRIENDLY")
      .describe("試合種別"),
    game_date: z
      .string()
      .nullable()
      .default(null)
      .describe("試合日 (YYYY-MM-DD)"),
    start_time: z
      .string()
      .nullable()
      .default(null)
      .describe("開始時刻 (HH:MM)"),
    end_time: z.string().nullable().default(null).describe("終了時刻 (HH:MM)"),
    ground_name: z.string().nullable().default(null).describe("グラウンド名"),
    min_players: z
      .number()
      .int()
      .min(1)
      .max(30)
      .default(9)
      .describe("最少人数"),
    rsvp_deadline: z
      .string()
      .nullable()
      .default(null)
      .describe("出欠回答期限 (ISO 8601)"),
    note: z.string().max(1000).nullable().default(null).describe("備考"),
  },
  async (params) => {
    const res = await post("/api/games", params);
    return toResult(res);
  },
);

server.tool(
  "get_game",
  "試合の詳細情報を取得する。現在のステータス・出欠状況・次のアクションを含む。",
  {
    game_id: z.string().uuid().describe("試合 ID"),
  },
  async ({ game_id }) => {
    const res = await get(`/api/games/${game_id}`);
    return toResult(res);
  },
);

server.tool(
  "list_games",
  "チームの試合一覧を取得する。",
  {
    team_id: z.string().uuid().describe("チーム ID"),
  },
  async ({ team_id }) => {
    const res = await get(`/api/games?team_id=${team_id}`);
    return toResult(res);
  },
);

server.tool(
  "transition_game",
  "試合のステータスを遷移させる。DRAFT→COLLECTING→CONFIRMED→COMPLETED→SETTLED の順に進む。CANCELLED への遷移も可能。CONFIRMED への遷移はガバナー条件を満たす必要がある。",
  {
    game_id: z.string().uuid().describe("試合 ID"),
    status: z
      .enum([
        "DRAFT",
        "COLLECTING",
        "CONFIRMED",
        "COMPLETED",
        "SETTLED",
        "CANCELLED",
      ])
      .describe("遷移先ステータス"),
    version: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe("楽観ロック用バージョン"),
    actor_id: z.string().default("SYSTEM").describe("操作者 ID"),
  },
  async ({ game_id, ...body }) => {
    const res = await post(`/api/games/${game_id}/transition`, body);
    return toResult(res);
  },
);

server.tool(
  "validate_game",
  "試合が確定 (CONFIRMED) 条件を満たしているか検証する。不足している条件がある場合はエラーと次のアクションを返す。",
  {
    game_id: z.string().uuid().describe("試合 ID"),
  },
  async ({ game_id }) => {
    const res = await post(`/api/games/${game_id}/validate`);
    return toResult(res);
  },
);

// ============================================================
// 出欠管理 (3 tools)
// ============================================================

server.tool(
  "request_rsvps",
  "試合の出欠確認を全メンバーに送信する。各メンバーに RSVP レコードが作成される。",
  {
    game_id: z.string().uuid().describe("試合 ID"),
  },
  async ({ game_id }) => {
    const res = await post(`/api/games/${game_id}/rsvps`);
    return toResult(res);
  },
);

server.tool(
  "get_rsvps",
  "試合の出欠回答一覧を取得する。",
  {
    game_id: z.string().uuid().describe("試合 ID"),
  },
  async ({ game_id }) => {
    const res = await get(`/api/games/${game_id}/rsvps`);
    return toResult(res);
  },
);

server.tool(
  "respond_rsvp",
  "出欠回答を登録する。AVAILABLE / UNAVAILABLE / MAYBE のいずれかを選択。",
  {
    rsvp_id: z.string().uuid().describe("RSVP ID"),
    response: z
      .enum(["AVAILABLE", "UNAVAILABLE", "MAYBE"])
      .describe("回答内容"),
    channel: z
      .enum(["APP", "LINE", "EMAIL", "WEB"])
      .default("WEB")
      .describe("回答チャネル"),
  },
  async ({ rsvp_id, ...body }) => {
    const res = await patch(`/api/rsvps/${rsvp_id}`, body);
    return toResult(res);
  },
);

// ============================================================
// 助っ人管理 (2 tools)
// ============================================================

server.tool(
  "list_helpers",
  "チームに登録されている助っ人の一覧を取得する。",
  {
    team_id: z.string().uuid().describe("チーム ID"),
  },
  async ({ team_id }) => {
    const res = await get(`/api/helpers?team_id=${team_id}`);
    return toResult(res);
  },
);

server.tool(
  "create_helper_requests",
  "試合に対して助っ人への参加依頼を作成する。複数の助っ人を一括で依頼できる。",
  {
    game_id: z.string().uuid().describe("試合 ID"),
    helper_ids: z.array(z.string().uuid()).min(1).describe("助っ人 ID の配列"),
    message: z
      .string()
      .max(500)
      .nullable()
      .default(null)
      .describe("依頼メッセージ"),
    actor_id: z.string().default("SYSTEM").describe("操作者 ID"),
  },
  async ({ game_id, ...body }) => {
    const res = await post(`/api/games/${game_id}/helper-requests`, body);
    return toResult(res);
  },
);

// ============================================================
// 対戦交渉 (3 tools)
// ============================================================

server.tool(
  "create_negotiation",
  "相手チームとの対戦交渉を開始する。候補日を提示して交渉を作成する。",
  {
    game_id: z.string().uuid().describe("試合 ID"),
    opponent_team_id: z.string().uuid().describe("相手チーム ID"),
    proposed_dates: z
      .array(z.string())
      .min(1)
      .describe("候補日の配列 (YYYY-MM-DD)"),
    message: z
      .string()
      .max(1000)
      .nullable()
      .default(null)
      .describe("交渉メッセージ"),
    actor_id: z.string().default("SYSTEM").describe("操作者 ID"),
    actor_type: z
      .enum(["USER", "SYSTEM", "AI"])
      .default("USER")
      .describe("操作者種別"),
  },
  async ({ game_id, ...body }) => {
    const res = await post(`/api/games/${game_id}/negotiations`, body);
    return toResult(res);
  },
);

server.tool(
  "update_negotiation",
  "対戦交渉のステータスを更新する。SENT→REPLIED→ACCEPTED/DECLINED の順に進む。",
  {
    negotiation_id: z.string().uuid().describe("交渉 ID"),
    status: z
      .enum(["SENT", "REPLIED", "ACCEPTED", "DECLINED", "CANCELLED"])
      .describe("遷移先ステータス"),
    reply_message: z
      .string()
      .max(1000)
      .nullable()
      .default(null)
      .describe("返信メッセージ"),
    cancel_reason: z
      .string()
      .nullable()
      .default(null)
      .describe("キャンセル理由"),
    actor_id: z.string().default("SYSTEM").describe("操作者 ID"),
    actor_type: z
      .enum(["USER", "SYSTEM", "AI"])
      .default("USER")
      .describe("操作者種別"),
  },
  async ({ negotiation_id, ...body }) => {
    const res = await patch(`/api/negotiations/${negotiation_id}`, body);
    return toResult(res);
  },
);

server.tool(
  "list_negotiations",
  "試合に関連する対戦交渉の一覧を取得する。",
  {
    game_id: z.string().uuid().describe("試合 ID"),
  },
  async ({ game_id }) => {
    const res = await get(`/api/games/${game_id}/negotiations`);
    return toResult(res);
  },
);

// ============================================================
// 精算 (3 tools)
// ============================================================

server.tool(
  "add_expense",
  "試合の費用を登録する。グラウンド代・審判代・ボール代などの経費を追加する。",
  {
    game_id: z.string().uuid().describe("試合 ID"),
    category: z
      .enum(["GROUND", "UMPIRE", "BALL", "DRINK", "TOURNAMENT_FEE", "OTHER"])
      .describe("費用カテゴリ"),
    amount: z.number().int().min(0).describe("金額 (円)"),
    paid_by: z.string().uuid().nullable().default(null).describe("立替者 ID"),
    split_with_opponent: z
      .boolean()
      .default(false)
      .describe("相手チームと折半するか"),
    note: z.string().max(500).nullable().default(null).describe("備考"),
    actor_id: z.string().default("SYSTEM").describe("操作者 ID"),
  },
  async ({ game_id, ...body }) => {
    const res = await post(`/api/games/${game_id}/expenses`, body);
    return toResult(res);
  },
);

server.tool(
  "calculate_settlement",
  "試合の精算を計算する。参加者ごとの支払い額・受取額を算出する。",
  {
    game_id: z.string().uuid().describe("試合 ID"),
  },
  async ({ game_id }) => {
    const res = await post(`/api/games/${game_id}/settlement`);
    return toResult(res);
  },
);

server.tool(
  "list_expenses",
  "試合に登録されている費用一覧を取得する。",
  {
    game_id: z.string().uuid().describe("試合 ID"),
  },
  async ({ game_id }) => {
    const res = await get(`/api/games/${game_id}/expenses`);
    return toResult(res);
  },
);

// ============================================================
// サーバー起動
// ============================================================

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("MCP server failed to start:", error);
  process.exit(1);
});
