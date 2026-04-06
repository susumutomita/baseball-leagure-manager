import { requireAuth, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  updateMemberSchema,
  writeAuditLog,
  zodToValidationError,
} from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** PATCH /api/members/:id — メンバー編集 */
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

  const parsed = updateMemberSchema.safeParse(body);
  if (!parsed.success) {
    const ve = zodToValidationError(parsed.error);
    return NextResponse.json(
      apiError("VALIDATION_ERROR", ve.issues.map((i) => i.message).join("; ")),
      { status: 400 },
    );
  }

  const { data: before } = await supabase
    .from("members")
    .select("*")
    .eq("id", id)
    .single();

  const { data, error } = await supabase
    .from("members")
    .update(parsed.data)
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json(
      apiError("NOT_FOUND", "メンバーが見つかりません"),
      { status: 404 },
    );
  }

  await writeAuditLog(supabase, {
    actor_type: "USER",
    actor_id: authResult.id,
    action: "UPDATE_MEMBER",
    target_type: "member",
    target_id: id,
    before_json: before,
    after_json: data,
  });

  return NextResponse.json(apiSuccess(data));
}

/** DELETE /api/members/:id — メンバー削除（論理削除） */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const roleCheck = requireRole(authResult, "ADMIN");
  if (roleCheck) return roleCheck;

  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("members")
    .update({ status: "INACTIVE" })
    .eq("id", id)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json(
      apiError("NOT_FOUND", "メンバーが見つかりません"),
      { status: 404 },
    );
  }

  await writeAuditLog(supabase, {
    actor_type: "USER",
    actor_id: authResult.id,
    action: "DELETE_MEMBER",
    target_type: "member",
    target_id: id,
    after_json: { status: "INACTIVE" },
  });

  return NextResponse.json(apiSuccess(data));
}
