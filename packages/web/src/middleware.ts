import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "./lib/line-auth";

// 認証不要のパス
const PUBLIC_PATHS = [
  "/login",
  "/api/auth",
  "/auth/callback",
  "/api/liff",
  "/liff",
  "/terms",
  "/privacy",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 公開パスはスキップ
  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // API ルートはスキップ（各ルート内で認証チェック）
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  // 公開ランディングページ(/)は認証不要
  if (pathname === "/") {
    return NextResponse.next();
  }

  // セッションcookieの存在チェック
  const sessionToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
