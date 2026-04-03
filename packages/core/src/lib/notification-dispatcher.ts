// ============================================================
// 通知ディスパッチャー — チャネル振り分け・リトライ・一括送信
// ============================================================
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod/v4";
import { createEmailSender } from "./email-service";
import { createLineSender } from "./line-messaging";
import type {
  NotificationChannel,
  NotificationEntry,
  NotificationResult,
  NotificationType,
} from "./notification";

// --- メンバー通知設定 ---

export const memberNotificationPreferenceSchema = z.object({
  memberId: z.string().uuid(),
  lineUserId: z.string().nullable(),
  email: z.string().email().nullable(),
  preferredChannels: z.array(z.enum(["LINE", "EMAIL"])).default(["LINE"]),
});

export type MemberNotificationPreference = z.infer<
  typeof memberNotificationPreferenceSchema
>;

// --- ディスパッチ入力 ---

export const dispatchNotificationSchema = z.object({
  teamId: z.string().uuid(),
  gameId: z.string().uuid().nullable(),
  notificationType: z.enum([
    "RSVP_REQUEST",
    "REMINDER",
    "DEADLINE",
    "HELPER_REQUEST",
    "SETTLEMENT",
    "CANCELLATION",
    "GROUND_ALERT",
  ]),
  content: z.string().max(2000),
  recipients: z.array(memberNotificationPreferenceSchema).min(1),
});

export type DispatchNotificationInput = z.infer<
  typeof dispatchNotificationSchema
>;

// --- リトライ設定 ---

export interface RetryConfig {
  readonly maxRetries: number;
  readonly baseDelayMs: number;
  readonly maxDelayMs: number;
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
};

// --- ディスパッチ結果 ---

export interface DispatchResult {
  readonly totalRecipients: number;
  readonly sentCount: number;
  readonly failedCount: number;
  readonly results: readonly NotificationResult[];
}

// --- 内部ヘルパー ---

function computeDelay(attempt: number, config: RetryConfig): number {
  const delay = config.baseDelayMs * 2 ** attempt;
  return Math.min(delay, config.maxDelayMs);
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * チャネルに応じた送信を実行する (リトライ付き)
 */
async function sendWithRetry(
  channel: NotificationChannel,
  recipientId: string,
  content: string,
  retryConfig: RetryConfig,
): Promise<boolean> {
  const sender =
    channel === "LINE"
      ? createLineSender()
      : channel === "EMAIL"
        ? createEmailSender()
        : async (_id: string, _c: string) => {
            console.log(`[PUSH stub] recipient=${_id}`);
            return true;
          };

  for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
    const success = await sender(recipientId, content);
    if (success) return true;

    if (attempt < retryConfig.maxRetries) {
      const delay = computeDelay(attempt, retryConfig);
      console.warn(
        `通知送信リトライ (channel=${channel}, recipient=${recipientId}, attempt=${attempt + 1}/${retryConfig.maxRetries})`,
      );
      await sleep(delay);
    }
  }

  return false;
}

/**
 * notification_logs テーブルにログを書き込む
 */
async function writeNotificationLog(
  supabase: SupabaseClient,
  entry: NotificationEntry & { delivered: boolean },
): Promise<void> {
  const { error } = await supabase.from("notification_logs").insert({
    team_id: entry.team_id,
    game_id: entry.game_id,
    recipient_type: entry.recipient_type,
    recipient_id: entry.recipient_id,
    channel: entry.channel,
    notification_type: entry.notification_type,
    content: entry.content,
    delivered: entry.delivered,
  });

  if (error) {
    console.error("通知ログ書き込み失敗:", error);
  }
}

/**
 * メンバーの通知設定に基づいてチャネルを決定する
 */
export function resolveChannels(
  pref: MemberNotificationPreference,
): NotificationChannel[] {
  const channels: NotificationChannel[] = [];

  for (const ch of pref.preferredChannels) {
    if (ch === "LINE" && pref.lineUserId) {
      channels.push("LINE");
    } else if (ch === "EMAIL" && pref.email) {
      channels.push("EMAIL");
    }
  }

  // フォールバック: 何も利用可能なチャネルがない場合でも LINE ID があれば LINE を使う
  if (channels.length === 0 && pref.lineUserId) {
    channels.push("LINE");
  }
  if (channels.length === 0 && pref.email) {
    channels.push("EMAIL");
  }

  return channels;
}

/**
 * 単一メンバーへ通知をディスパッチする
 */
export async function dispatchToMember(
  supabase: SupabaseClient,
  teamId: string,
  gameId: string | null,
  notificationType: NotificationType,
  content: string,
  pref: MemberNotificationPreference,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG,
): Promise<NotificationResult[]> {
  const channels = resolveChannels(pref);
  const results: NotificationResult[] = [];

  for (const channel of channels) {
    const recipientAddress =
      channel === "LINE"
        ? pref.lineUserId!
        : channel === "EMAIL"
          ? pref.email!
          : pref.memberId;

    const delivered = await sendWithRetry(
      channel,
      recipientAddress,
      content,
      retryConfig,
    );

    await writeNotificationLog(supabase, {
      team_id: teamId,
      game_id: gameId,
      recipient_type: "MEMBER",
      recipient_id: pref.memberId,
      channel,
      notification_type: notificationType,
      content,
      delivered,
    });

    results.push({
      recipient_id: pref.memberId,
      channel,
      delivered,
    });
  }

  return results;
}

/**
 * 複数メンバーへ通知を一括ディスパッチする
 */
export async function dispatchNotifications(
  supabase: SupabaseClient,
  input: DispatchNotificationInput,
  retryConfig: RetryConfig = DEFAULT_RETRY_CONFIG,
): Promise<DispatchResult> {
  const parsed = dispatchNotificationSchema.parse(input);
  const allResults: NotificationResult[] = [];

  for (const recipient of parsed.recipients) {
    const results = await dispatchToMember(
      supabase,
      parsed.teamId,
      parsed.gameId,
      parsed.notificationType,
      parsed.content,
      recipient,
      retryConfig,
    );
    allResults.push(...results);
  }

  const sentCount = allResults.filter((r) => r.delivered).length;

  return {
    totalRecipients: parsed.recipients.length,
    sentCount,
    failedCount: allResults.length - sentCount,
    results: allResults,
  };
}

/**
 * 通知履歴を取得する
 */
export async function getNotificationHistory(
  supabase: SupabaseClient,
  filters: {
    teamId: string;
    gameId?: string;
    limit?: number;
    offset?: number;
  },
): Promise<{
  data: Array<{
    id: string;
    team_id: string;
    game_id: string | null;
    recipient_type: string;
    recipient_id: string;
    channel: string;
    notification_type: string;
    content: string | null;
    delivered: boolean | null;
    sent_at: string;
  }>;
  count: number;
}> {
  let query = supabase
    .from("notification_logs")
    .select("*", { count: "exact" })
    .eq("team_id", filters.teamId)
    .order("sent_at", { ascending: false });

  if (filters.gameId) {
    query = query.eq("game_id", filters.gameId);
  }

  const limit = filters.limit ?? 50;
  const offset = filters.offset ?? 0;
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("通知履歴取得失敗:", error);
    return { data: [], count: 0 };
  }

  return { data: data ?? [], count: count ?? 0 };
}
