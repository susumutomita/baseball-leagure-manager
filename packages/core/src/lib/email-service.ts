// ============================================================
// Email サービス — Resend SDK を使ったメール送信
// ============================================================

// --- テンプレートコンテキスト (LINE と共通構造) ---

export interface EmailRsvpReminderContext {
  readonly teamName: string;
  readonly gameTitle: string;
  readonly gameDate: string | null;
  readonly deadline: string | null;
  readonly rsvpUrl: string;
}

export interface EmailGameConfirmedContext {
  readonly teamName: string;
  readonly gameTitle: string;
  readonly gameDate: string | null;
  readonly startTime: string | null;
  readonly groundName: string | null;
  readonly detailUrl: string;
}

export interface EmailSettlementRequestContext {
  readonly teamName: string;
  readonly gameTitle: string;
  readonly amount: number;
  readonly paypayLink: string | null;
  readonly detailUrl: string;
}

// --- テンプレート関数 ---

export interface EmailContent {
  readonly subject: string;
  readonly html: string;
}

/** 出欠リマインドメールを生成する */
export function buildRsvpReminderEmail(
  ctx: EmailRsvpReminderContext,
): EmailContent {
  const datePart = ctx.gameDate ? `<p>日程: ${ctx.gameDate}</p>` : "";
  const deadlinePart = ctx.deadline
    ? `<p style="color: red;">締切: ${ctx.deadline}</p>`
    : "";
  return {
    subject: `【${ctx.teamName}】出欠確認のお願い — ${ctx.gameTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>出欠確認のお願い</h2>
        <p>「${ctx.gameTitle}」の出欠を回答してください。</p>
        ${datePart}
        ${deadlinePart}
        <p><a href="${ctx.rsvpUrl}" style="display: inline-block; padding: 12px 24px; background: #06C755; color: white; text-decoration: none; border-radius: 4px;">回答する</a></p>
      </div>
    `.trim(),
  };
}

/** 試合確定通知メールを生成する */
export function buildGameConfirmedEmail(
  ctx: EmailGameConfirmedContext,
): EmailContent {
  const datePart = ctx.gameDate ? `<p>日程: ${ctx.gameDate}</p>` : "";
  const timePart = ctx.startTime ? `<p>開始: ${ctx.startTime}</p>` : "";
  const groundPart = ctx.groundName ? `<p>会場: ${ctx.groundName}</p>` : "";
  return {
    subject: `【${ctx.teamName}】試合確定 — ${ctx.gameTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>試合確定のお知らせ</h2>
        <p>「${ctx.gameTitle}」が確定しました。</p>
        ${datePart}
        ${timePart}
        ${groundPart}
        <p><a href="${ctx.detailUrl}" style="display: inline-block; padding: 12px 24px; background: #06C755; color: white; text-decoration: none; border-radius: 4px;">詳細を見る</a></p>
      </div>
    `.trim(),
  };
}

/** 精算依頼メールを生成する */
export function buildSettlementRequestEmail(
  ctx: EmailSettlementRequestContext,
): EmailContent {
  const paypayPart = ctx.paypayLink
    ? `<p><a href="${ctx.paypayLink}" style="display: inline-block; padding: 12px 24px; background: #FF0033; color: white; text-decoration: none; border-radius: 4px;">PayPayで支払う</a></p>`
    : "";
  return {
    subject: `【${ctx.teamName}】精算のお願い — ${ctx.gameTitle}`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>精算のお願い</h2>
        <p>「${ctx.gameTitle}」の精算をお願いします。</p>
        <p style="font-size: 24px; font-weight: bold;">¥${ctx.amount.toLocaleString()}</p>
        ${paypayPart}
        <p><a href="${ctx.detailUrl}">詳細を見る</a></p>
      </div>
    `.trim(),
  };
}

// --- Resend クライアント ---

export interface EmailSendResult {
  readonly success: boolean;
  readonly messageId?: string;
  readonly error?: string;
}

export interface EmailSendOptions {
  readonly to: string;
  readonly subject: string;
  readonly html: string;
  readonly from?: string;
}

// biome-ignore lint/suspicious/noExplicitAny: dynamic import for optional dependency
function createResendClient(): any | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { Resend } = require("resend");
    return new Resend(apiKey);
  } catch {
    return null;
  }
}

const DEFAULT_FROM = "Mound <noreply@mound.app>";

/**
 * Resend SDK を使ってメールを送信する
 */
export async function sendEmail(
  options: EmailSendOptions,
): Promise<EmailSendResult> {
  const client = createResendClient();
  if (!client) {
    console.log(`[EMAIL stub] to=${options.to}, subject=${options.subject}`);
    return { success: true, messageId: "stub" };
  }

  try {
    const result = await client.emails.send({
      from: options.from ?? DEFAULT_FROM,
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    if (result.error) {
      return {
        success: false,
        error: result.error.message ?? "Unknown Resend error",
      };
    }

    return { success: true, messageId: result.data?.id };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * ChannelSender 互換のメール送信関数を作成する
 */
export function createEmailSender(): (
  recipientEmail: string,
  content: string,
) => Promise<boolean> {
  return async (recipientEmail: string, content: string): Promise<boolean> => {
    const result = await sendEmail({
      to: recipientEmail,
      subject: "Mound からのお知らせ",
      html: `<div style="font-family: sans-serif;">${content}</div>`,
    });
    if (!result.success) {
      console.error(`メール送信失敗 (to=${recipientEmail}):`, result.error);
    }
    return result.success;
  };
}
