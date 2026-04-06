// ============================================================
// 招待リンクユーティリティ — チーム参加招待の生成・検証
// HMAC-SHA256 署名付きで改ざんを防止
// ============================================================
import { createHmac } from "node:crypto";

/** 招待リンクのペイロード */
export interface InvitationPayload {
  teamId: string;
  teamName: string;
  invitedBy: string;
  role: "MEMBER" | "ADMIN";
  expiresAt: string;
}

/** 招待リンクの検証結果 */
export interface InvitationValidation {
  valid: boolean;
  reason?: string;
  payload?: InvitationPayload;
}

/**
 * HMAC-SHA256 署名を生成する。
 * SECRET が未設定の場合はフォールバックキーを使用（開発環境用）。
 */
function sign(data: string, secret?: string): string {
  const key =
    secret || process.env.INVITATION_TOKEN_SECRET || "dev-fallback-key";
  return createHmac("sha256", key).update(data).digest("base64url");
}

/**
 * 招待トークンを生成する（ペイロード + HMAC 署名）
 *
 * @param payload - チームID・チーム名・招待者・ロール・有効期限
 * @param secret - 署名用シークレット（省略時は環境変数 INVITATION_TOKEN_SECRET）
 * @returns `{base64url_payload}.{hmac_signature}` 形式のトークン
 */
export function generateInvitationToken(
  payload: InvitationPayload,
  secret?: string,
): string {
  const json = JSON.stringify(payload);
  const encoded = Buffer.from(json).toString("base64url");
  const signature = sign(encoded, secret);
  return `${encoded}.${signature}`;
}

/**
 * 招待トークンをデコードする（署名検証付き）
 *
 * @returns 有効なペイロード。署名不正・形式不正の場合は null。
 */
export function decodeInvitationToken(
  token: string,
  secret?: string,
): InvitationPayload | null {
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
      typeof parsed.teamId === "string" &&
      typeof parsed.teamName === "string" &&
      typeof parsed.invitedBy === "string" &&
      typeof parsed.expiresAt === "string"
    ) {
      return parsed as InvitationPayload;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 招待トークンを検証する（署名 + 有効期限）
 */
export function validateInvitation(
  token: string,
  now: Date = new Date(),
  secret?: string,
): InvitationValidation {
  const payload = decodeInvitationToken(token, secret);

  if (!payload) {
    return { valid: false, reason: "無効な招待リンクです" };
  }

  if (!payload.teamId || !payload.teamName || !payload.expiresAt) {
    return { valid: false, reason: "招待情報が不完全です" };
  }

  const expiresAt = new Date(payload.expiresAt);
  if (expiresAt <= now) {
    return { valid: false, reason: "招待リンクの有効期限が切れています" };
  }

  return { valid: true, payload };
}

/**
 * 招待URLを構築する
 */
export function buildInvitationUrl(baseUrl: string, token: string): string {
  return `${baseUrl}/invite/${token}`;
}

/**
 * デフォルトの有効期限 (7日後) を設定した招待ペイロードを作成する
 */
export function createInvitationPayload(
  teamId: string,
  teamName: string,
  invitedBy: string,
  role: "MEMBER" | "ADMIN" = "MEMBER",
  expirationDays = 7,
): InvitationPayload {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expirationDays);

  return {
    teamId,
    teamName,
    invitedBy,
    role,
    expiresAt: expiresAt.toISOString(),
  };
}
