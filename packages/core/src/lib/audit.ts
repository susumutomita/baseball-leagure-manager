import type { SupabaseClient } from "@supabase/supabase-js";

export interface AuditEntry {
  actor_type: "USER" | "SYSTEM" | "AI";
  actor_id: string;
  action: string;
  target_type: string;
  target_id: string;
  before_json?: Record<string, unknown> | null;
  after_json?: Record<string, unknown> | null;
}

export interface AuditResult {
  success: boolean;
  id?: string;
  error?: string;
}

/**
 * 監査ログを書き込む
 * 結果を返すので呼び出し側がエラーを検知できる
 */
export async function writeAuditLog(
  supabase: SupabaseClient,
  entry: AuditEntry,
): Promise<AuditResult> {
  const { data, error } = await supabase
    .from("audit_logs")
    .insert(entry)
    .select("id")
    .single();

  if (error) {
    console.error("監査ログ書き込み失敗:", error);
    return { success: false, error: error.message };
  }

  return { success: true, id: data?.id };
}

/** 監査アクション定数 */
export const AUDIT_ACTIONS = {
  GAME_CREATED: "GAME_CREATED",
  GAME_TRANSITION: "GAME_TRANSITION",
  GAME_UPDATED: "GAME_UPDATED",
  RSVP_RESPONDED: "RSVP_RESPONDED",
  NEGOTIATION_CREATED: "NEGOTIATION_CREATED",
  NEGOTIATION_UPDATED: "NEGOTIATION_UPDATED",
  HELPER_REQUESTED: "HELPER_REQUESTED",
  HELPER_RESPONDED: "HELPER_RESPONDED",
  SETTLEMENT_CALCULATED: "SETTLEMENT_CALCULATED",
  SETTLEMENT_COMPLETED: "SETTLEMENT_COMPLETED",
  MEMBER_ADDED: "MEMBER_ADDED",
  MEMBER_REMOVED: "MEMBER_REMOVED",
} as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

/**
 * ゲーム状態遷移の監査ログを書き込むヘルパー
 */
export async function auditGameTransition(
  supabase: SupabaseClient,
  actorId: string,
  actorType: "USER" | "SYSTEM" | "AI",
  gameId: string,
  fromStatus: string,
  toStatus: string,
): Promise<AuditResult> {
  return writeAuditLog(supabase, {
    actor_type: actorType,
    actor_id: actorId,
    action: AUDIT_ACTIONS.GAME_TRANSITION,
    target_type: "game",
    target_id: gameId,
    before_json: { status: fromStatus },
    after_json: { status: toStatus },
  });
}
