// ============================================================
// RSVP トークン — Issue #132
// ゲームごと・メンバーごとのトークンベースRSVP
// ============================================================

export interface RsvpTokenPayload {
  gameId: string;
  memberId: string;
  rsvpId: string;
  expiresAt: string;
}

/**
 * RSVPトークンを生成（Base64エンコード）
 */
export function generateRsvpToken(payload: RsvpTokenPayload): string {
  const json = JSON.stringify(payload);
  return Buffer.from(json).toString("base64url");
}

/**
 * RSVPトークンをデコード
 */
export function decodeRsvpToken(token: string): RsvpTokenPayload | null {
  try {
    const json = Buffer.from(token, "base64url").toString("utf-8");
    const payload = JSON.parse(json);
    if (
      typeof payload.gameId === "string" &&
      typeof payload.memberId === "string" &&
      typeof payload.rsvpId === "string" &&
      typeof payload.expiresAt === "string"
    ) {
      return payload as RsvpTokenPayload;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * RSVPトークンの有効性を検証
 */
export function validateRsvpToken(
  token: string,
  now: Date = new Date(),
): {
  valid: boolean;
  reason?: string;
  payload?: RsvpTokenPayload;
} {
  const payload = decodeRsvpToken(token);
  if (!payload) {
    return { valid: false, reason: "トークンが無効です" };
  }

  const expires = new Date(payload.expiresAt);
  if (now > expires) {
    return { valid: false, reason: "トークンの有効期限が切れています" };
  }

  return { valid: true, payload };
}

/**
 * RSVP用のWebリンクを構築
 */
export function buildRsvpUrl(baseUrl: string, token: string): string {
  return `${baseUrl}/rsvp/${token}`;
}
