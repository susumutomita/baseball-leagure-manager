import { requireAuth, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  assertHelperRequestTransition,
  respondHelperRequestSchema,
  writeAuditLog,
  zodToValidationError,
} from "@match-engine/core";
import type { HelperRequestStatus } from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** PATCH /api/helper-requests/:id — 助っ人打診への回答 */
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

  const parsed = respondHelperRequestSchema.safeParse(body);
  if (!parsed.success) {
    const ve = zodToValidationError(parsed.error);
    return NextResponse.json(
      apiError("VALIDATION_ERROR", ve.issues.map((i) => i.message).join("; ")),
      { status: 400 },
    );
  }

  const input = parsed.data;

  const { data: hr, error: fetchError } = await supabase
    .from("helper_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError) {
    return NextResponse.json(
      apiError("NOT_FOUND", "助っ人打診が見つかりません"),
      { status: 404 },
    );
  }

  const newStatus = input.status as HelperRequestStatus;
  try {
    assertHelperRequestTransition(hr.status as HelperRequestStatus, newStatus);
  } catch (_e) {
    return NextResponse.json(
      apiError(
        "INVALID_TRANSITION",
        `状態遷移が不正です: ${hr.status} → ${newStatus}`,
        [
          {
            action: "check_fulfillment",
            reason: "助っ人充足状況を確認してください",
            priority: "medium",
            suggested_params: { game_id: hr.game_id },
          },
        ],
      ),
      { status: 422 },
    );
  }

  const updateFields: Record<string, unknown> = { status: newStatus };
  if (newStatus === "ACCEPTED" || newStatus === "DECLINED") {
    updateFields.responded_at = new Date().toISOString();
  }
  if (newStatus === "CANCELLED") {
    updateFields.cancelled_at = new Date().toISOString();
    updateFields.cancel_reason = input.cancel_reason ?? "FULFILLED";
  }

  const { data, error } = await supabase
    .from("helper_requests")
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
    actor_type: "USER",
    actor_id: input.actor_id,
    action: `HELPER_REQUEST:${hr.status}→${newStatus}`,
    target_type: "helper_request",
    target_id: id,
    before_json: { status: hr.status },
    after_json: { status: newStatus },
  });

  return NextResponse.json(
    apiSuccess(data, [
      {
        action: "check_fulfillment",
        reason: "助っ人の充足状況を確認してください",
        priority: "high",
        suggested_params: { game_id: hr.game_id },
      },
    ]),
  );
}
