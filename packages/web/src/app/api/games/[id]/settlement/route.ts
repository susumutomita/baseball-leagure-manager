import { requireAuth, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess, writeAuditLog } from "@match-engine/core";
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
  const { error: gameError } = await supabase
    .from("games")
    .select("id")
    .eq("id", id)
    .single();

  if (gameError) {
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

  const totalCost = expenses.reduce((sum, e) => sum + e.amount, 0);
  const opponentShare = expenses
    .filter((e) => e.split_with_opponent)
    .reduce((sum, e) => sum + Math.floor(e.amount / 2), 0);
  const teamCost = totalCost - opponentShare;
  const perMember = Math.ceil(teamCost / memberCount);

  // upsert settlement
  const { data, error } = await supabase
    .from("settlements")
    .upsert(
      {
        game_id: id,
        total_cost: totalCost,
        opponent_share: opponentShare,
        team_cost: teamCost,
        member_count: memberCount,
        per_member: perMember,
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
    apiSuccess(data, [
      {
        action: "transition_game",
        reason: "精算が完了したら SETTLED に遷移してください",
        priority: "medium",
        suggested_params: { game_id: id, new_status: "SETTLED" },
      },
    ]),
  );
}

/** GET /api/games/:id/settlement — 精算情報取得 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("settlements")
    .select("*")
    .eq("game_id", id)
    .single();

  if (error) {
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

  return NextResponse.json(apiSuccess(data, []));
}
