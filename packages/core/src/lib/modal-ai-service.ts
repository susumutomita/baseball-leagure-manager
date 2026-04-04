// ============================================================
// Modal AI サービス — Gemma 4 モデルを Modal 上で実行
// OpenAI-compatible API を使用
// ============================================================

import type {
  AttendancePrediction,
  HelperRecommendation,
  NegotiationMessageContext,
  PredictAttendanceGameInput,
  PredictAttendanceInput,
  RecommendHelpersInput,
  WeeklyReportGameInput,
} from "./ai-service";

const MODAL_MODEL = "gemma-4";

interface ModalConfig {
  apiUrl: string;
  apiKey: string;
}

function getModalConfig(): ModalConfig | null {
  const apiUrl = process.env.MODAL_API_URL;
  if (!apiUrl) return null;
  const apiKey = process.env.MODAL_API_KEY;
  return { apiUrl, apiKey: apiKey ?? "" };
}

async function callModal(
  prompt: string,
  systemPrompt?: string,
): Promise<string | null> {
  const config = getModalConfig();
  if (!config) return null;

  const res = await fetch(`${config.apiUrl}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {}),
    },
    body: JSON.stringify({
      model: MODAL_MODEL,
      messages: [
        ...(systemPrompt
          ? [{ role: "system" as const, content: systemPrompt }]
          : []),
        { role: "user" as const, content: prompt },
      ],
      temperature: 0.7,
      max_tokens: 1024,
    }),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  return data.choices?.[0]?.message?.content ?? null;
}

// --- 公開関数 ---

/**
 * メンバーの出欠予測を行う (Modal / Gemma 4)
 */
export async function predictAttendanceModal(
  member: PredictAttendanceInput,
  game: PredictAttendanceGameInput,
): Promise<AttendancePrediction> {
  const fallback: AttendancePrediction = {
    probability: member.attendance_rate,
    reasoning:
      "AI分析が利用できないため、過去の出席率をそのまま使用しています。",
  };

  const prompt = `あなたは草野球チームの出欠予測AIです。以下の情報から、このメンバーが試合に参加する確率を予測してください。

メンバー: ${member.name}
過去の出席率: ${(member.attendance_rate * 100).toFixed(1)}%
無断欠席率: ${(member.no_show_rate * 100).toFixed(1)}%
試合日: ${game.game_date ?? "未定"}
試合種別: ${game.game_type}

JSON形式で回答してください（他のテキストは不要）:
{"probability": 0.0〜1.0の数値, "reasoning": "理由の説明"}`;

  try {
    const text = await callModal(prompt);
    if (!text) return fallback;

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
 * 助っ人の推薦を行う (Modal / Gemma 4)
 */
export async function recommendHelpersModal(
  helpers: RecommendHelpersInput[],
  needed: number,
): Promise<HelperRecommendation[]> {
  const fallback: HelperRecommendation[] = helpers
    .sort((a, b) => b.reliability_score - a.reliability_score)
    .slice(0, needed)
    .map((h) => ({
      helper_id: h.id,
      reason: `信頼度スコア: ${h.reliability_score}、過去の助っ人回数: ${h.times_helped}回`,
    }));

  const helperList = helpers
    .map(
      (h) =>
        `- ID: ${h.id}, 名前: ${h.name}, 信頼度: ${h.reliability_score}, 助っ人回数: ${h.times_helped}回`,
    )
    .join("\n");

  const prompt = `あなたは草野球チームの助っ人推薦AIです。以下の助っ人候補から、${needed}人を推薦してください。
信頼度スコアと過去の貢献回数を考慮してください。

助っ人候補:
${helperList}

JSON配列で回答してください（他のテキストは不要）:
[{"helper_id": "ID", "reason": "推薦理由"}]`;

  try {
    const text = await callModal(prompt);
    if (!text) return fallback;

    const parsed = JSON.parse(text) as HelperRecommendation[];
    return parsed.slice(0, needed);
  } catch {
    return fallback;
  }
}

/**
 * 対戦交渉メッセージを生成する (Modal / Gemma 4)
 */
export async function generateNegotiationMessageModal(
  context: NegotiationMessageContext,
): Promise<string> {
  const fallback = `${context.opponent_name} 御中\n\nいつもお世話になっております。${context.team_name}です。\n下記の日程で試合をお願いできませんでしょうか。\n\n候補日:\n${context.proposed_dates.map((d) => `・${d}`).join("\n")}${context.ground_name ? `\n\n会場: ${context.ground_name}` : ""}\n\nご検討のほどよろしくお願いいたします。`;

  const prompt = `あなたは草野球チームの連絡担当AIです。対戦相手に送る丁寧な交渉メッセージを日本語で作成してください。

自チーム名: ${context.team_name}
相手チーム名: ${context.opponent_name}
候補日程: ${context.proposed_dates.join(", ")}
${context.ground_name ? `会場: ${context.ground_name}` : "会場: 未定"}

メッセージ本文のみを返してください（JSON不要）。丁寧で簡潔な文章にしてください。`;

  try {
    const text = await callModal(prompt);
    if (!text) return fallback;
    return text.trim() || fallback;
  } catch {
    return fallback;
  }
}

/**
 * 週次レポートを生成する (Modal / Gemma 4)
 */
export async function generateWeeklyReportModal(
  games: WeeklyReportGameInput[],
): Promise<string> {
  if (games.length === 0) {
    return "今週の試合予定はありません。";
  }

  const fallback = games
    .map(
      (g) =>
        `・${g.title}（${g.game_date ?? "日程未定"}）: ${g.status} — 参加${g.available_count}/${g.min_players}人`,
    )
    .join("\n");

  const gameList = games
    .map(
      (g) =>
        `- ${g.title}: 日程=${g.game_date ?? "未定"}, 状態=${g.status}, 参加可能=${g.available_count}人, 最低人数=${g.min_players}人`,
    )
    .join("\n");

  const prompt = `あなたは草野球チームのマネージャーAIです。以下の試合情報をもとに、チームメンバー向けの週次サマリーレポートを日本語で作成してください。

試合一覧:
${gameList}

簡潔でわかりやすいレポートを本文のみで返してください（JSON不要）。人数が不足している試合があれば注意喚起してください。`;

  try {
    const text = await callModal(prompt);
    if (!text) return fallback;
    return text.trim() || fallback;
  } catch {
    return fallback;
  }
}
