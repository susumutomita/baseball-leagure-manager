import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/line-auth";
// ============================================================
// API ルート用 認証・認可ヘルパー
// LINE OAuth JWT セッション (mound_session cookie) を使用
// ============================================================
import { createClient } from "@/lib/supabase/server";
import { apiError } from "@match-engine/core";
import type { MemberRole } from "@match-engine/core";
import { hasRole } from "@match-engine/core";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export interface AuthenticatedMember {
  id: string;
  team_id: string;
  name: string;
  role: MemberRole;
  line_user_id: string | null;
}

/** LINE OAuth JWT セッションからログイン中ユーザーの member を取得 */
export async function getAuthMember(): Promise<AuthenticatedMember | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionToken) return null;

  // JWT を検証して LINE プロフィールを取得
  const profile = await verifySessionToken(sessionToken);
  if (!profile) return null;

  // LINE user ID で members テーブルから検索
  const supabase = await createClient();
  const { data: member } = await supabase
    .from("members")
    .select("id, team_id, name, role, line_user_id")
    .eq("line_user_id", profile.userId)
    .eq("status", "ACTIVE")
    .single();

  if (!member) return null;

  return member as AuthenticatedMember;
}

/** 認証必須 — 未認証なら 401 レスポンスを返す */
export async function requireAuth(): Promise<
  AuthenticatedMember | NextResponse
> {
  const member = await getAuthMember();
  if (!member) {
    return NextResponse.json(
      apiError("UNAUTHORIZED", "ログインが必要です", [
        {
          action: "login",
          reason: "LINE Loginでログインしてください",
          priority: "high",
        },
      ]),
      { status: 401 },
    );
  }
  return member;
}

/** 認可チェック — 権限不足なら 403 レスポンスを返す */
export function requireRole(
  member: AuthenticatedMember,
  required: MemberRole,
): NextResponse | null {
  if (!hasRole(member.role, required)) {
    return NextResponse.json(
      apiError(
        "FORBIDDEN",
        `この操作には ${required} 以上の権限が必要です`,
        [],
      ),
      { status: 403 },
    );
  }
  return null;
}
