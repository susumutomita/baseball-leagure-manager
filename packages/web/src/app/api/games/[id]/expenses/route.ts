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

/** POST /api/games/:id/expenses — 支出登録 */
export async function POST(
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

  const parsed = createExpenseSchema.safeParse(body);
  if (!parsed.success) {
    const ve = zodToValidationError(parsed.error);
    return NextResponse.json(
      apiError("VALIDATION_ERROR", ve.issues.map((i) => i.message).join("; ")),
      { status: 400 },
    );
  }

  const input = parsed.data;

  const { data: gameData, error: gameError } = await supabase
    .from("games")
    .select("id, team_id")
    .eq("id", id)
    .single();

  if (gameError) {
    return NextResponse.json(apiError("NOT_FOUND", "試合が見つかりません"), {
      status: 404,
    });
  }

  if (gameData.team_id !== authResult.team_id) {
    return NextResponse.json(
      apiError("FORBIDDEN", "アクセス権限がありません"),
      { status: 403 },
    );
  }

  const { data, error } = await supabase
    .from("expenses")
    .insert({
      game_id: id,
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
        suggested_params: { game_id: id },
      },
    ]),
    { status: 201 },
  );
}

/** GET /api/games/:id/expenses — 支出一覧 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;
  const supabase = await createClient();

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("team_id")
    .eq("id", id)
    .single();

  if (gameError) {
    return NextResponse.json(apiError("NOT_FOUND", "試合が見つかりません"), {
      status: 404,
    });
  }

  if (game.team_id !== authResult.team_id) {
    return NextResponse.json(
      apiError("FORBIDDEN", "アクセス権限がありません"),
      { status: 403 },
    );
  }

  const { data, error } = await supabase
    .from("expenses")
    .select("*, members:paid_by(name)")
    .eq("game_id", id);

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
