// ============================================================
// 通知サービス — notification_logs テーブルを通じた通知管理
// ============================================================
import type { SupabaseClient } from "@supabase/supabase-js";

// --- 通知タイプ ---
export const NOTIFICATION_TYPES = [
  "RSVP_REQUEST",
  "REMINDER",
  "DEADLINE",
  "HELPER_REQUEST",
  "SETTLEMENT",
  "CANCELLATION",
  "GROUND_ALERT",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

// --- チャネル ---
export const NOTIFICATION_CHANNELS = ["LINE", "EMAIL", "PUSH"] as const;
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number];

// --- 受信者タイプ ---
export const RECIPIENT_TYPES = ["MEMBER", "HELPER", "OPPONENT"] as const;
export type RecipientType = (typeof RECIPIENT_TYPES)[number];

// --- 通知ログエントリ ---
export interface NotificationEntry {
  team_id: string;
  game_id: string | null;
  recipient_type: RecipientType;
  recipient_id: string;
  channel: NotificationChannel;
  notification_type: NotificationType;
  content: string | null;
}

// --- 通知結果 ---
export interface NotificationResult {
  recipient_id: string;
  channel: NotificationChannel;
  delivered: boolean;
}

// --- チャネル送信関数の型 ---
export type ChannelSender = (
  recipientId: string,
  content: string,
) => Promise<boolean>;

// --- チャネルディスパッチャー ---
export interface ChannelDispatchers {
  LINE: ChannelSender;
  EMAIL: ChannelSender;
  PUSH: ChannelSender;
}

/**
 * notification_logs テーブルに通知レコードを挿入する
 */
export async function queueNotification(
  supabase: SupabaseClient,
  entry: NotificationEntry,
): Promise<{ id: string } | null> {
  const { data, error } = await supabase
    .from("notification_logs")
    .insert({
      team_id: entry.team_id,
      game_id: entry.game_id,
      recipient_type: entry.recipient_type,
      recipient_id: entry.recipient_id,
      channel: entry.channel,
      notification_type: entry.notification_type,
      content: entry.content,
      delivered: false,
    })
    .select("id")
    .single();

  if (error) {
    console.error("通知キュー登録失敗:", error);
    return null;
  }

  return data;
}

/**
 * 通知を送信し、結果を notification_logs に記録する
 */
export async function sendNotification(
  supabase: SupabaseClient,
  entry: NotificationEntry,
  dispatchers: ChannelDispatchers,
): Promise<NotificationResult> {
  const sender = dispatchers[entry.channel];
  const delivered = await sender(entry.recipient_id, entry.content ?? "");

  // notification_logs に記録
  await supabase.from("notification_logs").insert({
    team_id: entry.team_id,
    game_id: entry.game_id,
    recipient_type: entry.recipient_type,
    recipient_id: entry.recipient_id,
    channel: entry.channel,
    notification_type: entry.notification_type,
    content: entry.content,
    delivered,
  });

  return {
    recipient_id: entry.recipient_id,
    channel: entry.channel,
    delivered,
  };
}

/**
 * 複数の通知を一括送信する
 */
export async function sendBulkNotifications(
  supabase: SupabaseClient,
  entries: readonly NotificationEntry[],
  dispatchers: ChannelDispatchers,
): Promise<NotificationResult[]> {
  const results: NotificationResult[] = [];

  for (const entry of entries) {
    const result = await sendNotification(supabase, entry, dispatchers);
    results.push(result);
  }

  return results;
}

/**
 * デフォルトのチャネルディスパッチャーを作成する。
 * LINE は lineMessageSender を使い、EMAIL / PUSH はスタブ。
 */
export function createDefaultDispatchers(
  lineSender: ChannelSender,
): ChannelDispatchers {
  return {
    LINE: lineSender,
    EMAIL: async (_recipientId: string, _content: string) => {
      console.log(`[EMAIL stub] recipient=${_recipientId}`);
      return true;
    },
    PUSH: async (_recipientId: string, _content: string) => {
      console.log(`[PUSH stub] recipient=${_recipientId}`);
      return true;
    },
  };
}
