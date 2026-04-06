// ============================================================
// RSVP トークン — HMAC-SHA256 署名付き
// Base64エンコード + HMAC署名で改ざんを防止
// ============================================================
import { createHmac } from "node:crypto";

export interface RsvpTokenPayload {
  gameId: string;
  memberId: string;
  rsvpId: string;
  expiresAt: string;
}

/**
 * HMAC-SHA256 署名を生成する。
 * SECRET が未設定の場合はフォールバックキーを使用（開発環境用）。
 */
function sign(data: string, secret?: string): string {
  const key = secret || process.env.RSVP_TOKEN_SECRET || "dev-fallback-key";
  return createHmac("sha256", key).update(data).digest("base64url");
}

/**
 * RSVP トークンを生成する（ペイロード + HMAC 署名）。
 *
 * @param payload - ゲームID・メンバーID・RSVP ID・有効期限
 * @param secret - 署名用シークレット（省略時は環境変数 RSVP_TOKEN_SECRET）
 * @returns `{base64url_payload}.{hmac_signature}` 形式のトークン
 */
export function generateRsvpToken(
  payload: RsvpTokenPayload,
  secret?: string,
): string {
  const json = JSON.stringify(payload);
  const encoded = Buffer.from(json).toString("base64url");
  const signature = sign(encoded, secret);
  return `${encoded}.${signature}`;
}

/**
 * RSVP トークンをデコードする（署名検証付き）。
 *
 * @returns 有効なペイロード。署名不正・形式不正の場合は null。
 */
export function decodeRsvpToken(
  token: string,
  secret?: string,
): RsvpTokenPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 2) return null;

    const [encoded, providedSig] = parts;
    const expectedSig = sign(encoded, secret);

    // タイミングセーフ比較
    if (providedSig.length !== expectedSig.length) return null;
    let mismatch = 0;
    for (let i = 0; i < providedSig.length; i++) {
      mismatch |= providedSig.charCodeAt(i) ^ expectedSig.charCodeAt(i);
    }
    if (mismatch !== 0) return null;

    const json = Buffer.from(encoded, "base64url").toString("utf-8");
    const parsed = JSON.parse(json);
    if (
      typeof parsed.gameId === "string" &&
      typeof parsed.memberId === "string" &&
      typeof parsed.rsvpId === "string" &&
      typeof parsed.expiresAt === "string"
    ) {
      return parsed as RsvpTokenPayload;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * RSVP トークンの有効性を検証する（署名 + 有効期限）。
 */
export function validateRsvpToken(
  token: string,
  now: Date = new Date(),
  secret?: string,
): {
  valid: boolean;
  reason?: string;
  payload?: RsvpTokenPayload;
} {
  const payload = decodeRsvpToken(token, secret);
  if (!payload) {
    return { valid: false, reason: "トークンが無効です" };
  }

  const expires = new Date(payload.expiresAt);
  if (now > expires) {
    return { valid: false, reason: "トークンの有効期限が切れています" };
  }

  return { valid: true, payload };
}

/** RSVP 用の Web リンクを構築する */
export function buildRsvpUrl(baseUrl: string, token: string): string {
  return `${baseUrl}/rsvp/${token}`;
}
