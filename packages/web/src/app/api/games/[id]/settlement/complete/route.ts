import { requireAuth, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess, writeAuditLog } from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** POST /api/games/:id/settlement/complete — 精算完了 */
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

  if (settlement.status === "SETTLED") {
    return NextResponse.json(apiError("INVALID_STATUS", "既に精算済みです"), {
      status: 422,
    });
  }

  // ステータスを SETTLED に更新
  const { data, error: updateError } = await supabase
    .from("settlements")
    .update({
      status: "SETTLED",
      settled_at: new Date().toISOString(),
    })
    .eq("id", settlement.id)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json(apiError("DATABASE_ERROR", updateError.message), {
      status: 400,
    });
  }

  await writeAuditLog(supabase, {
    actor_type: "USER",
    actor_id: authResult.id,
    action: "COMPLETE_SETTLEMENT",
    target_type: "settlement",
    target_id: settlement.id,
    before_json: { status: settlement.status },
    after_json: { status: "SETTLED", settled_at: data.settled_at },
  });

  return NextResponse.json(apiSuccess(data));
}
