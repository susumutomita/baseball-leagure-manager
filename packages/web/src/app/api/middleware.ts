// ============================================================
// API ルート共通ミドルウェアヘルパー
// 認証チェック + レート制限
// ============================================================
import { requireAuth, requireRole } from "@/lib/auth";
import type { AuthenticatedMember } from "@/lib/auth";
import { apiError } from "@match-engine/core";
import type { MemberRole } from "@match-engine/core";
import { NextResponse } from "next/server";

// --- 認証・認可ラッパー ---

export type AuthSuccess = { member: AuthenticatedMember };
export type AuthFailure = { response: NextResponse };
export type AuthResult = AuthSuccess | AuthFailure;

/** 認証チェック — 成功なら member、失敗なら NextResponse を返す */
export async function checkAuth(
  requiredRole?: MemberRole,
): Promise<AuthResult> {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) {
    return { response: authResult };
  }
  if (requiredRole) {
    const roleCheck = requireRole(authResult, requiredRole);
    if (roleCheck) {
      return { response: roleCheck };
    }
  }
  return { member: authResult };
}

export function isAuthFailure(result: AuthResult): result is AuthFailure {
  return "response" in result;
}

// --- レート制限 (インメモリ簡易実装) ---

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

const DEFAULT_WINDOW_MS = 60_000; // 1分
const DEFAULT_MAX_REQUESTS = 60; // 1分あたり60リクエスト

interface RateLimitOptions {
  windowMs?: number;
  maxRequests?: number;
}

/**
 * 簡易レート制限チェック
 * @returns null: OK / NextResponse: 制限超過
 */
export function checkRateLimit(
  key: string,
  options?: RateLimitOptions,
): NextResponse | null {
  const windowMs = options?.windowMs ?? DEFAULT_WINDOW_MS;
  const maxRequests = options?.maxRequests ?? DEFAULT_MAX_REQUESTS;
  const now = Date.now();

  const entry = rateLimitStore.get(key);

  if (!entry || now >= entry.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return null;
  }

  entry.count++;
  if (entry.count > maxRequests) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return NextResponse.json(
      apiError("RATE_LIMITED", "リクエスト数が制限を超えました", [
        {
          action: "retry",
          reason: `${retryAfter}秒後に再試行してください`,
          priority: "low",
        },
      ]),
      {
        status: 429,
        headers: { "Retry-After": String(retryAfter) },
      },
    );
  }

  return null;
}

// 定期クリーンアップ (期限切れエントリの除去)
if (typeof globalThis !== "undefined") {
  const CLEANUP_INTERVAL = 5 * 60_000; // 5分ごと
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitStore) {
      if (now >= entry.resetAt) {
        rateLimitStore.delete(key);
      }
    }
  }, CLEANUP_INTERVAL).unref?.();
}
