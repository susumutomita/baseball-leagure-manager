import { requireAuth, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  generatePayPayLink,
  writeAuditLog,
} from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** POST /api/games/:id/settlement/notify — 精算通知送信 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const roleCheck = requireRole(authResult, "ADMIN");
  if (roleCheck) return roleCheck;

  const { id } = await params;
  const supabase = await createClient();

  // 精算情報を取得
  const { data: settlement, error: settlementError } = await supabase
    .from("settlements")
    .select("*")
    .eq("game_id", id)
    .single();

  if (settlementError || !settlement) {
    return NextResponse.json(
      apiError("NOT_FOUND", "精算情報が見つかりません"),
      { status: 404 },
    );
  }

  if (settlement.status !== "DRAFT") {
    return NextResponse.json(
      apiError(
        "INVALID_STATUS",
        `精算ステータスが DRAFT ではありません (現在: ${settlement.status})`,
      ),
      { status: 422 },
    );
  }

  // 試合情報を取得（通知内容に使用）
  const { data: game } = await supabase
    .from("games")
    .select("title, team_id")
    .eq("id", id)
    .single();

  if (!game) {
    return NextResponse.json(apiError("NOT_FOUND", "試合が見つかりません"), {
      status: 404,
    });
  }

  // PayPay リンク生成
  const paypayLink = generatePayPayLink(
    settlement.per_member,
    `${game.title} 精算`,
  );

  // 参加メンバーを取得（出席者 or AVAILABLE メンバー）
  const { data: attendances } = await supabase
    .from("attendances")
    .select("member_id")
    .eq("game_id", id);

  let recipientIds: string[] = [];

  if (attendances && attendances.length > 0) {
    recipientIds = attendances.map((a) => a.member_id);
  } else {
    const { data: rsvps } = await supabase
      .from("rsvps")
      .select("member_id")
      .eq("game_id", id)
      .eq("response", "AVAILABLE");

    recipientIds = rsvps?.map((r) => r.member_id) ?? [];
  }

  // 通知ログを挿入
  if (recipientIds.length > 0) {
    const notificationLogs = recipientIds.map((memberId) => ({
      team_id: game.team_id,
      game_id: id,
      recipient_type: "MEMBER" as const,
      recipient_id: memberId,
      channel: "LINE" as const,
      notification_type: "SETTLEMENT" as const,
      content: `精算金額: ¥${settlement.per_member.toLocaleString()} PayPay: ${paypayLink}`,
    }));

    await supabase.from("notification_logs").insert(notificationLogs);
  }

  // ステータスを NOTIFIED に更新
  const { error: updateError } = await supabase
    .from("settlements")
    .update({ status: "NOTIFIED" })
    .eq("id", settlement.id);

  if (updateError) {
    return NextResponse.json(apiError("DATABASE_ERROR", updateError.message), {
      status: 400,
    });
  }

  await writeAuditLog(supabase, {
    actor_type: "USER",
    actor_id: authResult.id,
    action: "NOTIFY_SETTLEMENT",
    target_type: "settlement",
    target_id: settlement.id,
    before_json: { status: "DRAFT" },
    after_json: {
      status: "NOTIFIED",
      paypay_link: paypayLink,
      notification_count: recipientIds.length,
    },
  });

  return NextResponse.json(
    apiSuccess({
      paypay_link: paypayLink,
      notification_count: recipientIds.length,
    }),
  );
}
