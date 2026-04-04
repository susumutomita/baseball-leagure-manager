import { requireAuth, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  calculateSettlement,
  generatePayPayLink,
  writeAuditLog,
} from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** POST /api/games/:id/settlement — 精算計算 */
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

  // 試合の存在確認
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, title")
    .eq("id", id)
    .single();

  if (gameError || !game) {
    return NextResponse.json(apiError("NOT_FOUND", "試合が見つかりません"), {
      status: 404,
    });
  }

  // 支出一覧
  const { data: expenses, error: expenseError } = await supabase
    .from("expenses")
    .select("*")
    .eq("game_id", id);

  if (expenseError) {
    return NextResponse.json(apiError("DATABASE_ERROR", expenseError.message), {
      status: 400,
    });
  }

  if (!expenses || expenses.length === 0) {
    return NextResponse.json(
      apiError("NO_EXPENSES", "支出が登録されていません", [
        {
          action: "add_expense",
          reason: "先に支出を登録してください",
          priority: "high",
          suggested_params: { game_id: id },
        },
      ]),
      { status: 422 },
    );
  }

  // 参加者数（出席者 or AVAILABLE メンバー + ACCEPTED 助っ人）
  const [attendancesRes, rsvpsRes, helpersRes] = await Promise.all([
    supabase.from("attendances").select("id").eq("game_id", id),
    supabase
      .from("rsvps")
      .select("id")
      .eq("game_id", id)
      .eq("response", "AVAILABLE"),
    supabase
      .from("helper_requests")
      .select("id")
      .eq("game_id", id)
      .eq("status", "ACCEPTED"),
  ]);

  const attendanceCount = attendancesRes.data?.length ?? 0;
  const rsvpCount = rsvpsRes.data?.length ?? 0;
  const helperCount = helpersRes.data?.length ?? 0;
  const memberCount =
    attendanceCount > 0 ? attendanceCount : rsvpCount + helperCount;

  if (memberCount === 0) {
    return NextResponse.json(apiError("NO_MEMBERS", "参加者がいません"), {
      status: 422,
    });
  }

  // コアロジックで精算計算
  const calc = calculateSettlement({ expenses, memberCount });

  // PayPay リンク生成
  const paypayLink = generatePayPayLink(
    calc.perMember,
    `${game.title ?? "試合"} 精算`,
  );

  // upsert settlement
  const { data, error } = await supabase
    .from("settlements")
    .upsert(
      {
        game_id: id,
        total_cost: calc.totalCost,
        opponent_share: calc.opponentShare,
        team_cost: calc.teamCost,
        member_count: calc.memberCount,
        per_member: calc.perMember,
        status: "DRAFT",
      },
      { onConflict: "game_id" },
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json(apiError("DATABASE_ERROR", error.message), {
      status: 400,
    });
  }

  await writeAuditLog(supabase, {
    actor_type: "SYSTEM",
    actor_id: "SYSTEM",
    action: "CALCULATE_SETTLEMENT",
    target_type: "settlement",
    target_id: data.id,
    after_json: data,
  });

  return NextResponse.json(
    apiSuccess(
      data,
      [
        {
          action: "transition_game",
          reason: "精算が完了したら SETTLED に遷移してください",
          priority: "medium",
          suggested_params: { game_id: id, new_status: "SETTLED" },
        },
      ],
      { paypay_link: paypayLink },
    ),
  );
}

/** GET /api/games/:id/settlement — 精算情報取得（支払いステータス含む） */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: settlement, error } = await supabase
    .from("settlements")
    .select("*")
    .eq("game_id", id)
    .single();

  if (error || !settlement) {
    return NextResponse.json(
      apiError("NOT_FOUND", "精算情報が見つかりません", [
        {
          action: "calculate_settlement",
          reason: "先に精算を計算してください",
          priority: "high",
          suggested_params: { game_id: id },
        },
      ]),
      { status: 404 },
    );
  }

  // 試合タイトルを取得して PayPay リンクを生成
  const { data: game } = await supabase
    .from("games")
    .select("title")
    .eq("id", id)
    .single();

  const paypayLink = generatePayPayLink(
    settlement.per_member,
    `${game?.title ?? "試合"} 精算`,
  );

  // 支払いステータスを取得（通知ログから SETTLEMENT タイプを参照）
  const { data: notifications } = await supabase
    .from("notification_logs")
    .select("recipient_id, created_at")
    .eq("game_id", id)
    .eq("notification_type", "SETTLEMENT");

  // 参加メンバー一覧を取得
  const { data: attendances } = await supabase
    .from("attendances")
    .select("member_id, members:member_id(id, name)")
    .eq("game_id", id);

  let members: { id: string; name: string; notified: boolean }[] = [];

  if (attendances && attendances.length > 0) {
    const notifiedIds = new Set(
      (notifications ?? []).map((n) => n.recipient_id),
    );
    members = attendances.map((a) => {
      const member = a.members as unknown as { id: string; name: string };
      return {
        id: member?.id ?? a.member_id,
        name: member?.name ?? "不明",
        notified: notifiedIds.has(a.member_id),
      };
    });
  } else {
    // fallback: RSVP AVAILABLE members
    const { data: rsvps } = await supabase
      .from("rsvps")
      .select("member_id, members:member_id(id, name)")
      .eq("game_id", id)
      .eq("response", "AVAILABLE");

    if (rsvps) {
      const notifiedIds = new Set(
        (notifications ?? []).map((n) => n.recipient_id),
      );
      members = rsvps.map((r) => {
        const member = r.members as unknown as { id: string; name: string };
        return {
          id: member?.id ?? r.member_id,
          name: member?.name ?? "不明",
          notified: notifiedIds.has(r.member_id),
        };
      });
    }
  }

  return NextResponse.json(
    apiSuccess(settlement, [], {
      paypay_link: paypayLink,
      members,
    }),
  );
}

/** PATCH /api/games/:id/settlement — 精算ステータス更新 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const roleCheck = requireRole(authResult, "ADMIN");
  if (roleCheck) return roleCheck;

  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();

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

  // ステータス更新
  const validStatuses = ["DRAFT", "NOTIFIED", "SETTLED"];
  if (body.status && !validStatuses.includes(body.status)) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "無効なステータスです"),
      { status: 400 },
    );
  }

  const updateData: Record<string, unknown> = {};
  if (body.status) {
    updateData.status = body.status;
    if (body.status === "SETTLED") {
      updateData.settled_at = new Date().toISOString();
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "更新するフィールドがありません"),
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("settlements")
    .update(updateData)
    .eq("id", settlement.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(apiError("DATABASE_ERROR", error.message), {
      status: 400,
    });
  }

  await writeAuditLog(supabase, {
    actor_type: "USER",
    actor_id: authResult.id,
    action: "UPDATE_SETTLEMENT",
    target_type: "settlement",
    target_id: settlement.id,
    before_json: { status: settlement.status },
    after_json: { status: data.status },
  });

  return NextResponse.json(apiSuccess(data));
}
