import { createClient } from "@supabase/supabase-js";

/**
 * ブラウザ用 Supabase クライアント（Anon Key使用）
 */
export function createBrowserClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を設定してください",
    );
  }

  return createClient(url, key);
}
