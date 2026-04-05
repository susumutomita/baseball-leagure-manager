// ============================================================
// 招待リンクユーティリティ — チーム参加招待の生成・検証
// ============================================================

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
 * 招待トークンを生成する (Base64エンコード)
 */
export function generateInvitationToken(payload: InvitationPayload): string {
  const json = JSON.stringify(payload);
  // ブラウザ/Node.js 両対応の Base64 エンコード
  if (typeof btoa === "function") {
    return btoa(encodeURIComponent(json));
  }
  return Buffer.from(json).toString("base64");
}

/**
 * 招待トークンをデコードする
 */
export function decodeInvitationToken(token: string): InvitationPayload | null {
  try {
    let json: string;
    if (typeof atob === "function") {
      json = decodeURIComponent(atob(token));
    } else {
      json = Buffer.from(token, "base64").toString("utf-8");
    }
    return JSON.parse(json) as InvitationPayload;
  } catch {
    return null;
  }
}

/**
 * 招待トークンを検証する
 */
export function validateInvitation(
  token: string,
  now: Date = new Date(),
): InvitationValidation {
  const payload = decodeInvitationToken(token);

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
