import { requireAuth, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  createExpenseSchema,
  writeAuditLog,
  zodToValidationError,
} from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** GET /api/expenses?game_id=xxx */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get("game_id");

  if (!gameId) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "game_id は必須です"),
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("expenses")
    .select("*, members:paid_by(name)")
    .eq("game_id", gameId);

  if (error) {
    return NextResponse.json(apiError("DATABASE_ERROR", error.message), {
      status: 400,
    });
  }

  const expenses = data ?? [];
  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);

  return NextResponse.json(
    apiSuccess(expenses, [], { total_amount: totalAmount }),
  );
}

/** POST /api/expenses — 支出登録 (game_id をボディで指定) */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const roleCheck = requireRole(authResult, "ADMIN");
  if (roleCheck) return roleCheck;

  const supabase = await createClient();
  const body = await request.json();

  const gameId = body.game_id;
  if (!gameId || typeof gameId !== "string") {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "game_id は必須です"),
      { status: 400 },
    );
  }

  const parsed = createExpenseSchema.safeParse(body);
  if (!parsed.success) {
    const ve = zodToValidationError(parsed.error);
    return NextResponse.json(
      apiError("VALIDATION_ERROR", ve.issues.map((i) => i.message).join("; ")),
      { status: 400 },
    );
  }

  const input = parsed.data;

  const { error: gameError } = await supabase
    .from("games")
    .select("id")
    .eq("id", gameId)
    .single();

  if (gameError) {
    return NextResponse.json(apiError("NOT_FOUND", "試合が見つかりません"), {
      status: 404,
    });
  }

  const { data, error } = await supabase
    .from("expenses")
    .insert({
      game_id: gameId,
      category: input.category,
      amount: input.amount,
      paid_by: input.paid_by,
      split_with_opponent: input.split_with_opponent,
      note: input.note,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(apiError("DATABASE_ERROR", error.message), {
      status: 400,
    });
  }

  await writeAuditLog(supabase, {
    actor_type: "USER",
    actor_id: input.actor_id,
    action: "ADD_EXPENSE",
    target_type: "expense",
    target_id: data.id,
    after_json: data,
  });

  return NextResponse.json(
    apiSuccess(data, [
      {
        action: "calculate_settlement",
        reason: "支出が登録されました。精算を計算できます",
        priority: "medium",
        suggested_params: { game_id: gameId },
      },
    ]),
    { status: 201 },
  );
}
