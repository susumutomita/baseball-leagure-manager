/**
 * サーバー側 LIFF アクセストークン検証
 * LINE API でトークンの有効性と発行元チャネルを確認する
 */

interface VerifyResult {
  lineUserId: string;
}

interface VerifyError {
  error: string;
}

export async function verifyLiffToken(
  accessToken: string,
): Promise<VerifyResult | VerifyError> {
  const channelId = process.env.LINE_CHANNEL_ID;
  if (!channelId) {
    return { error: "LINE_CHANNEL_ID is not configured" };
  }

  const res = await fetch(
    `https://api.line.me/oauth2/v2.1/verify?access_token=${encodeURIComponent(accessToken)}`,
  );

  if (!res.ok) {
    return { error: "Invalid access token" };
  }

  const data = (await res.json()) as {
    client_id: string;
    expires_in: number;
  };

  if (data.client_id !== channelId) {
    return { error: "Token channel mismatch" };
  }

  if (data.expires_in <= 0) {
    return { error: "Token expired" };
  }

  // トークンが有効 → プロフィールからユーザーIDを取得
  const profileRes = await fetch("https://api.line.me/v2/profile", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!profileRes.ok) {
    return { error: "Failed to fetch profile" };
  }

  const profile = (await profileRes.json()) as { userId: string };
  return { lineUserId: profile.userId };
}

export function isVerifyError(
  result: VerifyResult | VerifyError,
): result is VerifyError {
  return "error" in result;
}

/** Authorization ヘッダーからトークンを抽出 */
export function extractToken(request: Request): string | null {
  const auth = request.headers.get("Authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7);
}
