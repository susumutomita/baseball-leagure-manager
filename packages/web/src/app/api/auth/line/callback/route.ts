import {
  SESSION_COOKIE_NAME,
  createSessionToken,
  exchangeCode,
  getLineProfile,
} from "@/lib/line-auth";
import { type NextRequest, NextResponse } from "next/server";

/** GET /api/auth/line/callback — LINE OAuth コールバック */
export async function GET(request: NextRequest) {
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

  // stateからリダイレクト先とnonceを復元
  let redirect = "/";
  let nonce: string | undefined;
  if (state) {
    try {
      const parsed = JSON.parse(Buffer.from(state, "base64url").toString()) as {
        redirect?: string;
        nonce?: string;
      };
      const parsedRedirect = parsed.redirect ?? "/";
      // オープンリダイレクト防止
      redirect =
        parsedRedirect.startsWith("/") && !parsedRedirect.startsWith("//")
          ? parsedRedirect
          : "/";
      nonce = parsed.nonce;
    } catch {
      // invalid state, use default redirect
    }
  }

  // CSRF検証: nonce cookie と state 内の nonce を照合
  const nonceCookie = request.cookies.get("line_oauth_nonce")?.value;
  if (!nonce || !nonceCookie || nonce !== nonceCookie) {
    return NextResponse.redirect(new URL("/login?error=invalid_state", origin));
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
    // nonce cookie を削除
    response.cookies.delete("line_oauth_nonce");

    return response;
  } catch (e) {
    const message = e instanceof Error ? e.message : "unknown error";
    console.error("LINE auth error:", message, e);
    // エラー種別をクエリパラムに含めてデバッグしやすくする
    const errorType = message.includes("credentials")
      ? "missing_env"
      : message.includes("token exchange")
        ? "token_exchange"
        : message.includes("SESSION_SECRET")
          ? "missing_secret"
          : "auth_failed";
    return NextResponse.redirect(new URL(`/login?error=${errorType}`, origin));
  }
}
