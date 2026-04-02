// ============================================================
// API ルート用 認証・認可ヘルパー
// ============================================================
import { createClient } from "@/lib/supabase/server";
import { apiError } from "@match-engine/core";
import type { MemberRole } from "@match-engine/core";
import { hasRole } from "@match-engine/core";
import { NextResponse } from "next/server";

export interface AuthenticatedMember {
  id: string;
  team_id: string;
  name: string;
  role: MemberRole;
  line_user_id: string | null;
}

/** Supabase Auth セッションからログイン中ユーザーの member を取得 */
export async function getAuthMember(): Promise<AuthenticatedMember | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // LINE OAuth の場合、provider_id (= LINE user ID) で members を検索
  const lineUserId =
    user.user_metadata?.provider_id ?? user.user_metadata?.sub ?? null;

  if (!lineUserId) return null;

  const { data: member } = await supabase
    .from("members")
    .select("id, team_id, name, role, line_user_id")
    .eq("line_user_id", lineUserId)
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
