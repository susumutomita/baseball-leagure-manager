import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseSecret = process.env.SUPABASE_SECRET_KEY;

export function createAdminClient() {
  if (!supabaseUrl || !supabaseSecret) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SECRET_KEY is not configured",
    );
  }

  return createClient(supabaseUrl, supabaseSecret, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
