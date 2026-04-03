import { requireAuth, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  dispatchNotifications,
  zodToValidationError,
} from "@match-engine/core";
import type { MemberNotificationPreference } from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";

const remindRequestSchema = z.object({
  game_id: z.string().uuid(),
  message: z.string().max(1000).nullable().default(null),
});

/** POST /api/notifications/remind — 試合リマインダー送信 (ADMIN以上) */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const roleCheck = requireRole(authResult, "ADMIN");
  if (roleCheck) return roleCheck;

  const supabase = await createClient();
  const body = await request.json();

  const parsed = remindRequestSchema.safeParse(body);
  if (!parsed.success) {
    const ve = zodToValidationError(parsed.error);
    return NextResponse.json(
      apiError("VALIDATION_ERROR", ve.issues.map((i) => i.message).join("; ")),
      { status: 400 },
    );
  }

  const { game_id, message } = parsed.data;

  // ゲーム情報を取得
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, team_id, title, game_date, rsvp_deadline")
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
      apiError("FORBIDDEN", "この試合のリマインダーを送信する権限がありません"),
      { status: 403 },
    );
  }

  // 未回答メンバーを取得
  const { data: rsvps } = await supabase
    .from("rsvps")
    .select("member_id")
    .eq("game_id", game_id)
    .eq("response", "NO_RESPONSE");

  if (!rsvps || rsvps.length === 0) {
    return NextResponse.json(
      apiSuccess({ sent: 0, total: 0 }, [
        {
          action: "check_rsvps",
          reason: "未回答のメンバーがいません",
          priority: "low",
        },
      ]),
    );
  }

  const memberIds = rsvps.map((r: { member_id: string }) => r.member_id);

  // メンバー情報を取得
  const { data: members } = await supabase
    .from("members")
    .select("id, line_user_id, email")
    .in("id", memberIds)
    .eq("status", "ACTIVE");

  if (!members || members.length === 0) {
    return NextResponse.json(
      apiSuccess({ sent: 0, total: 0 }, [
        {
          action: "check_members",
          reason: "通知先のアクティブメンバーが見つかりません",
          priority: "medium",
        },
      ]),
    );
  }

  const content =
    message ??
    `【リマインダー】「${game.title}」の出欠を回答してください。${game.rsvp_deadline ? `\n締切: ${game.rsvp_deadline}` : ""}`;

  const recipients: MemberNotificationPreference[] = members.map(
    (m: { id: string; line_user_id: string | null; email: string | null }) => ({
      memberId: m.id,
      lineUserId: m.line_user_id,
      email: m.email,
      preferredChannels: m.line_user_id
        ? (["LINE"] as const)
        : (["EMAIL"] as const),
    }),
  );

  const result = await dispatchNotifications(supabase, {
    teamId: game.team_id,
    gameId: game_id,
    notificationType: "REMINDER",
    content,
    recipients,
  });

  return NextResponse.json(
    apiSuccess({
      sent: result.sentCount,
      failed: result.failedCount,
      total: result.totalRecipients,
    }),
  );
}
