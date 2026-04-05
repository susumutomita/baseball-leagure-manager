import { requireAuth, requireRole } from "@/lib/auth";
import { sendLineMessage } from "@/lib/line-messaging";
import { createClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  createDefaultDispatchers,
  sendBulkNotifications,
  sendNotificationSchema,
  zodToValidationError,
} from "@match-engine/core";
import type {
  NotificationChannel,
  NotificationEntry,
} from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** POST /api/notifications/send — 通知送信 (ADMIN以上) */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const roleCheck = requireRole(authResult, "ADMIN");
  if (roleCheck) return roleCheck;

  const supabase = await createClient();
  const body = await request.json();

  const parsed = sendNotificationSchema.safeParse(body);
  if (!parsed.success) {
    const ve = zodToValidationError(parsed.error);
    return NextResponse.json(
      apiError("VALIDATION_ERROR", ve.issues.map((i) => i.message).join("; "), [
        {
          action: "send_notification",
          reason: "入力を修正して再試行してください",
          priority: "high",
        },
      ]),
      { status: 400 },
    );
  }

  const { game_id, notification_type, message } = parsed.data;

  // ゲーム情報を取得
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, team_id, title")
    .eq("id", game_id)
    .single();

  if (gameError || !game) {
    return NextResponse.json(apiError("NOT_FOUND", "試合が見つかりません"), {
      status: 404,
    });
  }

  // 権限チェック: 自チームの試合か
  if (game.team_id !== authResult.team_id) {
    return NextResponse.json(
      apiError("FORBIDDEN", "この試合の通知を送信する権限がありません"),
      { status: 403 },
    );
  }

  // 通知タイプに応じて受信者を取得
  const recipients = await getRecipients(
    supabase,
    game_id,
    game.team_id,
    notification_type,
  );

  if (recipients.length === 0) {
    return NextResponse.json(
      apiSuccess({ sent: 0, queued: 0, total: 0 }, [
        {
          action: "check_recipients",
          reason: "対象の受信者が見つかりませんでした",
          priority: "medium",
        },
      ]),
    );
  }

  // 通知エントリを作成
  const content = message ?? buildDefaultMessage(notification_type, game.title);
  const entries: NotificationEntry[] = recipients.map((r) => ({
    team_id: game.team_id,
    game_id,
    recipient_type: "MEMBER" as const,
    recipient_id: r.id,
    channel: (r.line_user_id ? "LINE" : "EMAIL") as NotificationChannel,
    notification_type,
    content,
  }));

  // LINE sender を使ったディスパッチャーを作成
  const dispatchers = createDefaultDispatchers(
    async (recipientId: string, msg: string) => {
      // recipient_id からメンバーの line_user_id を取得
      const recipient = recipients.find((r) => r.id === recipientId);
      if (!recipient?.line_user_id) return false;
      return sendLineMessage(recipient.line_user_id, msg);
    },
  );

  const results = await sendBulkNotifications(supabase, entries, dispatchers);

  const sent = results.succeeded.length;
  const failed = results.failed.length;

  return NextResponse.json(apiSuccess({ sent, failed, total: results.total }));
}

// --- ヘルパー関数 ---

interface Recipient {
  id: string;
  line_user_id: string | null;
  email: string | null;
}

async function getRecipients(
  supabase: ReturnType<typeof createClient> extends Promise<infer T>
    ? T
    : never,
  gameId: string,
  teamId: string,
  notificationType: string,
): Promise<Recipient[]> {
  switch (notificationType) {
    case "RSVP_REQUEST": {
      // 未回答メンバーを取得
      const { data: rsvps } = await supabase
        .from("rsvps")
        .select("member_id")
        .eq("game_id", gameId)
        .eq("response", "NO_RESPONSE");

      if (!rsvps || rsvps.length === 0) return [];

      const memberIds = rsvps.map((r: { member_id: string }) => r.member_id);
      const { data: members } = await supabase
        .from("members")
        .select("id, line_user_id, email")
        .in("id", memberIds)
        .eq("status", "ACTIVE");

      return (members ?? []) as Recipient[];
    }
    case "REMINDER":
    case "DEADLINE":
    case "SETTLEMENT":
    case "CANCELLATION": {
      // チーム全メンバーに送信
      const { data: members } = await supabase
        .from("members")
        .select("id, line_user_id, email")
        .eq("team_id", teamId)
        .eq("status", "ACTIVE");

      return (members ?? []) as Recipient[];
    }
    case "HELPER_REQUEST": {
      // ヘルパーリクエスト送信済みの助っ人を取得
      const { data: requests } = await supabase
        .from("helper_requests")
        .select("helper_id")
        .eq("game_id", gameId)
        .eq("status", "PENDING");

      if (!requests || requests.length === 0) return [];

      const helperIds = requests.map((r: { helper_id: string }) => r.helper_id);
      const { data: helpers } = await supabase
        .from("helpers")
        .select("id, line_user_id, email")
        .in("id", helperIds);

      return (helpers ?? []) as Recipient[];
    }
    case "GROUND_ALERT": {
      // ADMIN メンバーにのみ送信
      const { data: admins } = await supabase
        .from("members")
        .select("id, line_user_id, email")
        .eq("team_id", teamId)
        .in("role", ["ADMIN", "SUPER_ADMIN"])
        .eq("status", "ACTIVE");

      return (admins ?? []) as Recipient[];
    }
    default:
      return [];
  }
}

function buildDefaultMessage(
  notificationType: string,
  gameTitle: string,
): string {
  switch (notificationType) {
    case "RSVP_REQUEST":
      return `【出欠確認】${gameTitle} の出欠を回答してください`;
    case "REMINDER":
      return `【リマインダー】${gameTitle} の出欠をまだ回答していません`;
    case "DEADLINE":
      return `【締切通知】${gameTitle} の出欠締切が近づいています`;
    case "HELPER_REQUEST":
      return `【助っ人依頼】${gameTitle} に参加いただけませんか？`;
    case "SETTLEMENT":
      return `【精算通知】${gameTitle} の精算が作成されました`;
    case "CANCELLATION":
      return `【中止通知】${gameTitle} は中止になりました`;
    case "GROUND_ALERT":
      return `【グラウンド通知】${gameTitle} に関するグラウンド情報があります`;
    default:
      return `【通知】${gameTitle}`;
  }
}
