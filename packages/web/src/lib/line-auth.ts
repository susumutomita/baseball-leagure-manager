/**
 * LINE Login OAuth2 サーバーサイド実装
 */
import { SignJWT, jwtVerify } from "jose";

const LINE_AUTH_URL = "https://access.line.me/oauth2/v2.1/authorize";
const LINE_TOKEN_URL = "https://api.line.me/oauth2/v2.1/token";
const LINE_PROFILE_URL = "https://api.line.me/v2/profile";

export interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
}

/** LINE 認証URLを生成 */
export function getLineAuthUrl(redirectUri: string, state: string): string {
  const channelId = process.env.LINE_CHANNEL_ID;
  if (!channelId) throw new Error("LINE_CHANNEL_ID is not configured");

  const params = new URLSearchParams({
    response_type: "code",
    client_id: channelId,
    redirect_uri: redirectUri,
    state,
    scope: "profile openid",
  });

  return `${LINE_AUTH_URL}?${params.toString()}`;
}

/** 認可コードをアクセストークンに交換 */
export async function exchangeCode(
  code: string,
  redirectUri: string,
): Promise<string> {
  const channelId = process.env.LINE_CHANNEL_ID;
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  if (!channelId || !channelSecret) {
    throw new Error("LINE credentials not configured");
  }

  const res = await fetch(LINE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: channelId,
      client_secret: channelSecret,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`LINE token exchange failed: ${err}`);
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

/** アクセストークンからプロフィール取得 */
export async function getLineProfile(
  accessToken: string,
): Promise<LineProfile> {
  const res = await fetch(LINE_PROFILE_URL, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) throw new Error("Failed to fetch LINE profile");

  return (await res.json()) as LineProfile;
}

/** セッショントークン (JWT) を生成 */
export async function createSessionToken(
  profile: LineProfile,
): Promise<string> {
  const secret = getJwtSecret();
  return new SignJWT({
    lineUserId: profile.userId,
    displayName: profile.displayName,
    pictureUrl: profile.pictureUrl,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

/** セッショントークンを検証 */
export async function verifySessionToken(
  token: string,
): Promise<LineProfile | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret);
    return {
      userId: payload.lineUserId as string,
      displayName: payload.displayName as string,
      pictureUrl: payload.pictureUrl as string | undefined,
    };
  } catch {
    return null;
  }
}

function getJwtSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET ?? process.env.LINE_CHANNEL_SECRET;
  if (!secret)
    throw new Error("SESSION_SECRET or LINE_CHANNEL_SECRET required");
  return new TextEncoder().encode(secret);
}

export const SESSION_COOKIE_NAME = "mound_session";
