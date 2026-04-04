import { getLineAuthUrl } from "@/lib/line-auth";
import { NextResponse } from "next/server";

/** GET /api/auth/line — LINE 認証URLにリダイレクト */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  let redirect = searchParams.get("redirect") ?? "/";

  // オープンリダイレクト防止: 相対パスのみ許可
  if (!redirect.startsWith("/") || redirect.startsWith("//")) {
    redirect = "/";
  }

  const origin = new URL(request.url).origin;
  const callbackUrl = `${origin}/api/auth/line/callback`;

  // CSRF防止: nonce を生成して state に含める
  const nonce = crypto.randomUUID();
  const state = Buffer.from(JSON.stringify({ redirect, nonce })).toString(
    "base64url",
  );

  const authUrl = getLineAuthUrl(callbackUrl, state);

  const response = NextResponse.redirect(authUrl);
  // nonce を cookie に保存して callback で検証
  response.cookies.set("line_oauth_nonce", nonce, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 600, // 10分
  });

  return response;
}
