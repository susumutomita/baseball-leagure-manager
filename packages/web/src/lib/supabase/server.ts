import { createClient } from "@supabase/supabase-js";

/**
 * サーバーサイド用 Supabase クライアント（Service Role Key使用）
 * API Routes や Server Components で使用する
 */
export function createServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を設定してください",
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false },
  });
}
