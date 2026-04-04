import { requireAuth, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  assertNegotiationTransition,
  updateNegotiationSchema,
  writeAuditLog,
  zodToValidationError,
} from "@match-engine/core";
import type { NegotiationStatus } from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** GET /api/negotiations/:id — 交渉詳細取得 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("negotiations")
    .select("*, opponent_teams(name, area, contact_name)")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json(apiError("NOT_FOUND", "交渉が見つかりません"), {
      status: 404,
    });
  }

  return NextResponse.json(apiSuccess(data, []));
}

/** PATCH /api/negotiations/:id — 交渉状態遷移 */
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

  const parsed = updateNegotiationSchema.safeParse(body);
  if (!parsed.success) {
    const ve = zodToValidationError(parsed.error);
    return NextResponse.json(
      apiError("VALIDATION_ERROR", ve.issues.map((i) => i.message).join("; ")),
      { status: 400 },
    );
  }

  const input = parsed.data;

  const { data: negotiation, error: fetchError } = await supabase
    .from("negotiations")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError) {
    return NextResponse.json(apiError("NOT_FOUND", "交渉が見つかりません"), {
      status: 404,
    });
  }

  const newStatus = input.status as NegotiationStatus;
  try {
    assertNegotiationTransition(
      negotiation.status as NegotiationStatus,
      newStatus,
    );
  } catch (_e) {
    return NextResponse.json(
      apiError(
        "INVALID_TRANSITION",
        `状態遷移が不正です: ${negotiation.status} → ${newStatus}`,
        [
          {
            action: "list_negotiations",
            reason: "交渉一覧を確認してください",
            priority: "medium",
            suggested_params: { game_id: negotiation.game_id },
          },
        ],
      ),
      { status: 422 },
    );
  }

  const updateFields: Record<string, unknown> = { status: newStatus };
  if (newStatus === "SENT") {
    updateFields.sent_at = new Date().toISOString();
  }
  if (
    newStatus === "REPLIED" ||
    newStatus === "ACCEPTED" ||
    newStatus === "DECLINED"
  ) {
    updateFields.replied_at = new Date().toISOString();
    if (input.reply_message) {
      updateFields.reply_received = input.reply_message;
    }
  }
  if (newStatus === "CANCELLED") {
    updateFields.cancelled_at = new Date().toISOString();
    updateFields.cancel_reason = input.cancel_reason;
  }

  const { data, error } = await supabase
    .from("negotiations")
    .update(updateFields)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(apiError("DATABASE_ERROR", error.message), {
      status: 400,
    });
  }

  await writeAuditLog(supabase, {
    actor_type: input.actor_type,
    actor_id: input.actor_id,
    action: `NEGOTIATION:${negotiation.status}→${newStatus}`,
    target_type: "negotiation",
    target_id: id,
    before_json: { status: negotiation.status },
    after_json: { status: newStatus },
  });

  const nextActions =
    newStatus === "ACCEPTED"
      ? [
          {
            action: "validate_game" as const,
            reason: "対戦相手が確定しました。試合の成立条件を確認してください",
            priority: "high" as const,
            suggested_params: { game_id: negotiation.game_id },
          },
        ]
      : newStatus === "DECLINED"
        ? [
            {
              action: "create_negotiation" as const,
              reason: "交渉が不成立でした。別のチームに打診してください",
              priority: "high" as const,
              suggested_params: { game_id: negotiation.game_id },
            },
          ]
        : [];

  return NextResponse.json(apiSuccess(data, nextActions));
}
