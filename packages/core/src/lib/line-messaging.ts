// ============================================================
// LINE Messaging API Client — LINE Push メッセージ送信
// ============================================================

// --- テンプレート型 ---

export interface LineTextMessage {
  readonly type: "text";
  readonly text: string;
}

export interface LineFlexMessage {
  readonly type: "flex";
  readonly altText: string;
  readonly contents: LineFlexContainer;
}

export interface LineFlexContainer {
  readonly type: "bubble";
  readonly header?: LineFlexBox;
  readonly body: LineFlexBox;
  readonly footer?: LineFlexBox;
}

export interface LineFlexBox {
  readonly type: "box";
  readonly layout: "vertical" | "horizontal" | "baseline";
  readonly contents: readonly LineFlexComponent[];
}

export type LineFlexComponent =
  | LineFlexText
  | LineFlexButton
  | LineFlexSeparator;

export interface LineFlexText {
  readonly type: "text";
  readonly text: string;
  readonly size?: string;
  readonly weight?: string;
  readonly color?: string;
  readonly wrap?: boolean;
}

export interface LineFlexButton {
  readonly type: "button";
  readonly action: {
    readonly type: "uri";
    readonly label: string;
    readonly uri: string;
  };
  readonly style?: "primary" | "secondary" | "link";
}

export interface LineFlexSeparator {
  readonly type: "separator";
  readonly margin?: string;
}

export type LineMessage = LineTextMessage | LineFlexMessage;

// --- 通知テンプレートコンテキスト ---

export interface RsvpReminderContext {
  readonly teamName: string;
  readonly gameTitle: string;
  readonly gameDate: string | null;
  readonly deadline: string | null;
  readonly rsvpUrl: string;
}

export interface GameConfirmedContext {
  readonly teamName: string;
  readonly gameTitle: string;
  readonly gameDate: string | null;
  readonly startTime: string | null;
  readonly groundName: string | null;
  readonly detailUrl: string;
}

export interface SettlementRequestContext {
  readonly teamName: string;
  readonly gameTitle: string;
  readonly amount: number;
  readonly paypayLink: string | null;
  readonly detailUrl: string;
}

// --- テンプレート関数 ---

/** 出欠リマインド用テキストメッセージを生成する */
export function buildRsvpReminderMessage(
  ctx: RsvpReminderContext,
): LineTextMessage {
  const datePart = ctx.gameDate ? `\n日程: ${ctx.gameDate}` : "";
  const deadlinePart = ctx.deadline ? `\n締切: ${ctx.deadline}` : "";
  return {
    type: "text",
    text: `【${ctx.teamName}】出欠確認のお願い\n\n「${ctx.gameTitle}」の出欠を回答してください。${datePart}${deadlinePart}\n\n回答はこちら:\n${ctx.rsvpUrl}`,
  };
}

/** 出欠リマインド用 Flex メッセージを生成する */
export function buildRsvpReminderFlex(
  ctx: RsvpReminderContext,
): LineFlexMessage {
  const bodyContents: LineFlexComponent[] = [
    {
      type: "text",
      text: `「${ctx.gameTitle}」`,
      size: "lg",
      weight: "bold",
      wrap: true,
    },
  ];
  if (ctx.gameDate) {
    bodyContents.push({
      type: "text",
      text: `日程: ${ctx.gameDate}`,
      size: "sm",
      color: "#666666",
      wrap: true,
    });
  }
  if (ctx.deadline) {
    bodyContents.push({
      type: "text",
      text: `締切: ${ctx.deadline}`,
      size: "sm",
      color: "#FF0000",
      wrap: true,
    });
  }

  return {
    type: "flex",
    altText: `【${ctx.teamName}】出欠確認のお願い`,
    contents: {
      type: "bubble",
      header: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "text",
            text: "出欠確認のお願い",
            size: "md",
            weight: "bold",
            color: "#FFFFFF",
          },
        ],
      },
      body: {
        type: "box",
        layout: "vertical",
        contents: bodyContents,
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [
          {
            type: "button",
            action: { type: "uri", label: "回答する", uri: ctx.rsvpUrl },
            style: "primary",
          },
        ],
      },
    },
  };
}

/** 試合確定通知テキストを生成する */
export function buildGameConfirmedMessage(
  ctx: GameConfirmedContext,
): LineTextMessage {
  const datePart = ctx.gameDate ? `\n日程: ${ctx.gameDate}` : "";
  const timePart = ctx.startTime ? `\n開始: ${ctx.startTime}` : "";
  const groundPart = ctx.groundName ? `\n会場: ${ctx.groundName}` : "";
  return {
    type: "text",
    text: `【${ctx.teamName}】試合確定のお知らせ\n\n「${ctx.gameTitle}」が確定しました。${datePart}${timePart}${groundPart}\n\n詳細:\n${ctx.detailUrl}`,
  };
}

/** 精算依頼テキストを生成する */
export function buildSettlementRequestMessage(
  ctx: SettlementRequestContext,
): LineTextMessage {
  const paypayPart = ctx.paypayLink
    ? `\n\nPayPayで支払う:\n${ctx.paypayLink}`
    : "";
  return {
    type: "text",
    text: `【${ctx.teamName}】精算のお願い\n\n「${ctx.gameTitle}」の精算をお願いします。\n金額: ¥${ctx.amount.toLocaleString()}${paypayPart}\n\n詳細:\n${ctx.detailUrl}`,
  };
}

// --- LINE Messaging API クライアント ---

export interface LinePushResult {
  readonly success: boolean;
  readonly messageId?: string;
  readonly error?: string;
}

/**
 * LINE Push API を使って指定ユーザーにメッセージを送信する
 */
export async function pushMessage(
  lineUserId: string,
  messages: readonly LineMessage[],
  channelAccessToken?: string,
): Promise<LinePushResult> {
  const token = channelAccessToken ?? process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    return { success: false, error: "LINE_CHANNEL_ACCESS_TOKEN が未設定です" };
  }

  try {
    const response = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: messages.map((msg) => {
          if (msg.type === "text") {
            return { type: "text", text: msg.text };
          }
          return {
            type: "flex",
            altText: msg.altText,
            contents: msg.contents,
          };
        }),
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return {
        success: false,
        error: `LINE API error (${response.status}): ${errorBody}`,
      };
    }

    return { success: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : "Unknown error";
    return { success: false, error: message };
  }
}

/**
 * ChannelSender 互換の LINE 送信関数を作成する
 */
export function createLineSender(
  channelAccessToken?: string,
): (recipientId: string, content: string) => Promise<boolean> {
  return async (recipientId: string, content: string): Promise<boolean> => {
    const result = await pushMessage(
      recipientId,
      [{ type: "text", text: content }],
      channelAccessToken,
    );
    if (!result.success) {
      console.error(`LINE送信失敗 (to=${recipientId}):`, result.error);
    }
    return result.success;
  };
}
