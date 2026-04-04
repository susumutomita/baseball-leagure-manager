import {
  SESSION_COOKIE_NAME,
  createSessionToken,
  exchangeCode,
  getLineProfile,
} from "@/lib/line-auth";
import { NextResponse } from "next/server";

/** GET /api/auth/line/callback — LINE OAuth コールバック */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  // ユーザーがキャンセルした場合
  if (error) {
    return NextResponse.redirect(new URL("/login?error=cancelled", origin));
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=no_code", origin));
  }

  // stateからリダイレクト先を復元
  let redirect = "/";
  if (state) {
    try {
      const parsed = JSON.parse(Buffer.from(state, "base64url").toString()) as {
        redirect?: string;
      };
      redirect = parsed.redirect ?? "/";
    } catch {
      // invalid state, use default redirect
    }
  }

  try {
    const callbackUrl = `${origin}/api/auth/line/callback`;
    const accessToken = await exchangeCode(code, callbackUrl);
    const profile = await getLineProfile(accessToken);
    const sessionToken = await createSessionToken(profile);

    const response = NextResponse.redirect(new URL(redirect, origin));
    response.cookies.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch (e) {
    console.error("LINE auth error:", e);
    return NextResponse.redirect(new URL("/login?error=auth_failed", origin));
  }
}
