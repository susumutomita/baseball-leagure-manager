import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "./lib/line-auth";

// 認証不要のパス
const PUBLIC_PATHS = [
  "/login",
  "/dev",
  "/api/auth",
  "/auth/callback",
  "/api/liff",
  "/liff",
  "/terms",
  "/privacy",
  "/help",
  "/docs",
  "/contact",
  "/legal",
  "/rsvp",
  "/invite",
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // CSRF: ミューテーション系リクエストの Origin ヘッダー検証
  if (["POST", "PATCH", "PUT", "DELETE"].includes(request.method)) {
    const origin = request.headers.get("origin");
    const host = request.headers.get("host");
    if (origin && host && !origin.includes(host)) {
      return NextResponse.json({ error: "Invalid origin" }, { status: 403 });
    }
  }

  // 公開パスはスキップ（完全一致 or パス区切り付き前方一致）
  if (
    PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`))
  ) {
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

  // /login にアクセスした場合はトップにリダイレクト（モーダル化のため）
  if (pathname === "/login" && sessionToken) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
