import { requireAuth, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  assertTransition,
  getAvailableTransitions,
  suggestNextActions,
  suggestOnTransitionError,
  transitionGameSchema,
  writeAuditLog,
  zodToValidationError,
} from "@match-engine/core";
import type { GameStatus } from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** POST /api/games/:id/transition — 状態遷移 (ADMIN以上) */
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

  const parsed = transitionGameSchema.safeParse(body);
  if (!parsed.success) {
    const ve = zodToValidationError(parsed.error);
    return NextResponse.json(
      apiError("VALIDATION_ERROR", ve.issues.map((i) => i.message).join("; ")),
      { status: 400 },
    );
  }

  const input = parsed.data;
  const newStatus = input.status as GameStatus;

  const { data: game, error: fetchError } = await supabase
    .from("games")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError) {
    return NextResponse.json(apiError("NOT_FOUND", "試合が見つかりません"), {
      status: 404,
    });
  }

  try {
    assertTransition(game.status as GameStatus, newStatus);
  } catch (_e) {
    const available = getAvailableTransitions(game.status as GameStatus);
    return NextResponse.json(
      apiError(
        "INVALID_TRANSITION",
        `状態遷移が不正です: ${game.status} → ${newStatus}`,
        suggestOnTransitionError(game.status, available),
        {
          current_status: game.status,
          available_transitions: available,
        },
      ),
      { status: 422 },
    );
  }

  // 楽観的ロック
  const expectedVersion = input.version ?? game.version;
  const { data, error } = await supabase
    .from("games")
    .update({ status: newStatus, version: game.version + 1 })
    .eq("id", id)
    .eq("version", expectedVersion)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json(
      apiError("CONFLICT", "他のユーザーが更新しました。リロードしてください", [
        {
          action: "get_game",
          reason: "最新の状態を取得してください",
          priority: "high",
          suggested_params: { game_id: id },
        },
      ]),
      { status: 409 },
    );
  }

  await writeAuditLog(supabase, {
    actor_type: "USER",
    actor_id: input.actor_id,
    action: `TRANSITION:${game.status}→${newStatus}`,
    target_type: "game",
    target_id: id,
    before_json: { status: game.status, version: game.version },
    after_json: { status: newStatus, version: data.version },
  });

  const nextActions = suggestNextActions({ game: data });

  return NextResponse.json(apiSuccess(data, nextActions));
}
