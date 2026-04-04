// ============================================================
// AI サービス — Claude API を利用した各種 AI 機能
// AI_PROVIDER=modal の場合は Modal (Gemma 4) に委譲
// ============================================================

import {
  generateNegotiationMessageModal,
  generateWeeklyReportModal,
  predictAttendanceModal,
  recommendHelpersModal,
} from "./modal-ai-service";

const MODEL = "claude-sonnet-4-20250514";

function useModal(): boolean {
  return process.env.AI_PROVIDER === "modal";
}

// biome-ignore lint/suspicious/noExplicitAny: dynamic import for optional dependency
function createAnthropicClient(): any | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Anthropic = require("@anthropic-ai/sdk").default;
    return new Anthropic({ apiKey });
  } catch {
    return null;
  }
}

// --- 型定義 ---

export interface AttendancePrediction {
  probability: number;
  reasoning: string;
}

export interface HelperRecommendation {
  helper_id: string;
  reason: string;
}

export interface PredictAttendanceInput {
  name: string;
  attendance_rate: number;
  no_show_rate: number;
}

export interface PredictAttendanceGameInput {
  game_date: string | null;
  game_type: string;
}

export interface RecommendHelpersInput {
  id: string;
  name: string;
  reliability_score: number;
  times_helped: number;
}

export interface WeeklyReportGameInput {
  title: string;
  status: string;
  game_date: string | null;
  available_count: number;
  min_players: number;
}

export interface NegotiationMessageContext {
  team_name: string;
  opponent_name: string;
  proposed_dates: string[];
  ground_name?: string;
}

// --- 公開関数 ---

/**
 * メンバーの出欠予測を行う
 */
export async function predictAttendance(
  member: PredictAttendanceInput,
  game: PredictAttendanceGameInput,
): Promise<AttendancePrediction> {
  if (useModal()) return predictAttendanceModal(member, game);

  const fallback: AttendancePrediction = {
    probability: member.attendance_rate,
    reasoning:
      "AI分析が利用できないため、過去の出席率をそのまま使用しています。",
  };

  const client = createAnthropicClient();
  if (!client) return fallback;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 300,
      messages: [
        {
          role: "user",
          content: `あなは草野球チームの出欠予測AIです。以下の情報から、このメンバーが試合に参加する確率を予測してください。

メンバー: ${member.name}
過去の出席率: ${(member.attendance_rate * 100).toFixed(1)}%
無断欠席率: ${(member.no_show_rate * 100).toFixed(1)}%
試合日: ${game.game_date ?? "未定"}
試合種別: ${game.game_type}

JSON形式で回答してください（他のテキストは不要）:
{"probability": 0.0〜1.0の数値, "reasoning": "理由の説明"}`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = JSON.parse(text) as AttendancePrediction;
    return {
      probability: Math.max(0, Math.min(1, parsed.probability)),
      reasoning: parsed.reasoning,
    };
  } catch {
    return fallback;
  }
}

/**
 * 助っ人の推薦を行う
 */
export async function recommendHelpers(
  helpers: RecommendHelpersInput[],
  needed: number,
): Promise<HelperRecommendation[]> {
  if (useModal()) return recommendHelpersModal(helpers, needed);

  const fallback: HelperRecommendation[] = helpers
    .sort((a, b) => b.reliability_score - a.reliability_score)
    .slice(0, needed)
    .map((h) => ({
      helper_id: h.id,
      reason: `信頼度スコア: ${h.reliability_score}、過去の助っ人回数: ${h.times_helped}回`,
    }));

  const client = createAnthropicClient();
  if (!client) return fallback;

  try {
    const helperList = helpers
      .map(
        (h) =>
          `- ID: ${h.id}, 名前: ${h.name}, 信頼度: ${h.reliability_score}, 助っ人回数: ${h.times_helped}回`,
      )
      .join("\n");

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `あなたは草野球チームの助っ人推薦AIです。以下の助っ人候補から、${needed}人を推薦してください。
信頼度スコアと過去の貢献回数を考慮してください。

助っ人候補:
${helperList}

JSON配列で回答してください（他のテキストは不要）:
[{"helper_id": "ID", "reason": "推薦理由"}]`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    const parsed = JSON.parse(text) as HelperRecommendation[];
    return parsed.slice(0, needed);
  } catch {
    return fallback;
  }
}

/**
 * 対戦交渉メッセージを生成する
 */
export async function generateNegotiationMessage(
  context: NegotiationMessageContext,
): Promise<string> {
  if (useModal()) return generateNegotiationMessageModal(context);

  const fallback = `${context.opponent_name} 御中\n\nいつもお世話になっております。${context.team_name}です。\n下記の日程で試合をお願いできませんでしょうか。\n\n候補日:\n${context.proposed_dates.map((d) => `・${d}`).join("\n")}${context.ground_name ? `\n\n会場: ${context.ground_name}` : ""}\n\nご検討のほどよろしくお願いいたします。`;

  const client = createAnthropicClient();
  if (!client) return fallback;

  try {
    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 500,
      messages: [
        {
          role: "user",
          content: `あなたは草野球チームの連絡担当AIです。対戦相手に送る丁寧な交渉メッセージを日本語で作成してください。

自チーム名: ${context.team_name}
相手チーム名: ${context.opponent_name}
候補日程: ${context.proposed_dates.join(", ")}
${context.ground_name ? `会場: ${context.ground_name}` : "会場: 未定"}

メッセージ本文のみを返してください（JSON不要）。丁寧で簡潔な文章にしてください。`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    return text.trim() || fallback;
  } catch {
    return fallback;
  }
}

/**
 * 週次レポートを生成する
 */
export async function generateWeeklyReport(
  games: WeeklyReportGameInput[],
): Promise<string> {
  if (useModal()) return generateWeeklyReportModal(games);

  if (games.length === 0) {
    return "今週の試合予定はありません。";
  }

  const fallback = games
    .map(
      (g) =>
        `・${g.title}（${g.game_date ?? "日程未定"}）: ${g.status} — 参加${g.available_count}/${g.min_players}人`,
    )
    .join("\n");

  const client = createAnthropicClient();
  if (!client) return fallback;

  try {
    const gameList = games
      .map(
        (g) =>
          `- ${g.title}: 日程=${g.game_date ?? "未定"}, 状態=${g.status}, 参加可能=${g.available_count}人, 最低人数=${g.min_players}人`,
      )
      .join("\n");

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content: `あなたは草野球チームのマネージャーAIです。以下の試合情報をもとに、チームメンバー向けの週次サマリーレポートを日本語で作成してください。

試合一覧:
${gameList}

簡潔でわかりやすいレポートを本文のみで返してください（JSON不要）。人数が不足している試合があれば注意喚起してください。`,
        },
      ],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";
    return text.trim() || fallback;
  } catch {
    return fallback;
  }
}
