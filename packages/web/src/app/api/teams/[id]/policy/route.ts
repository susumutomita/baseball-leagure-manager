import { requireAuth, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  getDefaultPolicy,
  negotiationPolicyPatchSchema,
  writeAuditLog,
  zodToValidationError,
} from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** GET /api/teams/:id/policy — 交渉ポリシー取得 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("teams")
    .select("settings_json")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json(apiError("DATABASE_ERROR", error.message), {
      status: 400,
    });
  }

  const policy =
    (data?.settings_json as Record<string, unknown> | null)
      ?.negotiation_policy ?? getDefaultPolicy();

  return NextResponse.json(apiSuccess(policy, []));
}

/** PATCH /api/teams/:id/policy — 交渉ポリシー更新 (ADMIN権限必須) */
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

  // バリデーション
  const parsed = negotiationPolicyPatchSchema.safeParse(body);
  if (!parsed.success) {
    const ve = zodToValidationError(parsed.error);
    return NextResponse.json(
      apiError("VALIDATION_ERROR", ve.issues.map((i) => i.message).join("; ")),
      { status: 400 },
    );
  }

  // 既存の settings_json を取得
  const { data: existing, error: fetchError } = await supabase
    .from("teams")
    .select("settings_json")
    .eq("id", id)
    .single();

  if (fetchError) {
    return NextResponse.json(apiError("DATABASE_ERROR", fetchError.message), {
      status: 400,
    });
  }

  const currentSettings =
    (existing?.settings_json as Record<string, unknown>) ?? {};
  const currentPolicy =
    (currentSettings.negotiation_policy as Record<string, unknown>) ??
    getDefaultPolicy();
  const newPolicy = { ...currentPolicy, ...parsed.data };
  const newSettings = { ...currentSettings, negotiation_policy: newPolicy };

  // 更新
  const { data, error: updateError } = await supabase
    .from("teams")
    .update({ settings_json: newSettings })
    .eq("id", id)
    .select("settings_json")
    .single();

  if (updateError) {
    return NextResponse.json(apiError("DATABASE_ERROR", updateError.message), {
      status: 400,
    });
  }

  // 監査ログ
  await writeAuditLog(supabase, {
    actor_type: "USER",
    actor_id: authResult.id,
    action: "UPDATE_NEGOTIATION_POLICY",
    target_type: "team",
    target_id: id,
    before_json: { negotiation_policy: currentPolicy },
    after_json: { negotiation_policy: newPolicy },
  });

  return NextResponse.json(
    apiSuccess(
      (data?.settings_json as Record<string, unknown>)?.negotiation_policy ??
        newPolicy,
      [],
    ),
  );
}
