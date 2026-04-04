import { getLineAuthUrl } from "@/lib/line-auth";
import { NextResponse } from "next/server";

/** GET /api/auth/line — LINE 認証URLにリダイレクト */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const redirect = searchParams.get("redirect") ?? "/";
  const origin = new URL(request.url).origin;
  const callbackUrl = `${origin}/api/auth/line/callback`;

  // stateにリダイレクト先をエンコード
  const state = Buffer.from(JSON.stringify({ redirect })).toString("base64url");

  const authUrl = getLineAuthUrl(callbackUrl, state);
  return NextResponse.redirect(authUrl);
}
