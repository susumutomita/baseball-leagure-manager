// ============================================================
// LINE Messaging API ヘルパー — push message 送信
// ============================================================

const LINE_API_BASE = "https://api.line.me/v2/bot/message/push";

/**
 * LINE Messaging API v2 で push メッセージを送信する。
 * 環境変数 LINE_CHANNEL_ACCESS_TOKEN を使用。
 *
 * @returns true if sent successfully, false otherwise
 */
export async function sendLineMessage(
  lineUserId: string,
  message: string,
): Promise<boolean> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!token) {
    console.error("LINE_CHANNEL_ACCESS_TOKEN が設定されていません");
    return false;
  }

  try {
    const response = await fetch(LINE_API_BASE, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [
          {
            type: "text",
            text: message,
          },
        ],
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(
        `LINE メッセージ送信失敗: status=${response.status} body=${body}`,
      );
      return false;
    }

    return true;
  } catch (error) {
    console.error("LINE メッセージ送信エラー:", error);
    return false;
  }
}
