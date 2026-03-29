import type { SupabaseClient } from "@supabase/supabase-js";

interface AuditEntry {
  actor_type: "USER" | "SYSTEM" | "AI";
  actor_id: string;
  action: string;
  target_type: string;
  target_id: string;
  before_json?: Record<string, unknown> | null;
  after_json?: Record<string, unknown> | null;
}

export async function writeAuditLog(
  supabase: SupabaseClient,
  entry: AuditEntry,
): Promise<void> {
  const { error } = await supabase.from("audit_logs").insert(entry);
  if (error) {
    console.error("監査ログ書き込み失敗:", error);
  }
}
