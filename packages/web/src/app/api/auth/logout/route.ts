import { SESSION_COOKIE_NAME } from "@/lib/line-auth";
import { NextResponse } from "next/server";

/** POST /api/auth/logout — セッションを破棄してログアウト */
export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
