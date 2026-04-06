import { requireAuth, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess, writeAuditLog } from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const updateTeamSchema = z.object({
  name: z.string().min(1, "チーム名は必須です").optional(),
  home_area: z.string().min(1, "活動エリアは必須です").optional(),
  activity_day: z.string().nullish(),
});

/** GET /api/teams/:id */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;

  if (authResult.team_id !== id) {
    return NextResponse.json(
      apiError("FORBIDDEN", "アクセス権限がありません"),
      { status: 403 },
    );
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json(apiError("NOT_FOUND", "チームが見つかりません"), {
      status: 404,
    });
  }

  return NextResponse.json(apiSuccess(data, []));
}

/** PATCH /api/teams/:id — チーム情報更新 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const roleCheck = requireRole(authResult, "ADMIN");
  if (roleCheck) return roleCheck;

  const { id } = await params;

  if (authResult.team_id !== id) {
    return NextResponse.json(
      apiError("FORBIDDEN", "アクセス権限がありません"),
      { status: 403 },
    );
  }

  const supabase = await createClient();
  const body = await request.json();

  const parsed = updateTeamSchema.safeParse(body);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((i) => i.message).join("; ");
    return NextResponse.json(apiError("VALIDATION_ERROR", messages), {
      status: 400,
    });
  }

  const { data: before, error: fetchError } = await supabase
    .from("teams")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError) {
    return NextResponse.json(apiError("NOT_FOUND", "チームが見つかりません"), {
      status: 404,
    });
  }

  const updateFields: Record<string, unknown> = {};
  const input = parsed.data;
  if (input.name !== undefined) updateFields.name = input.name;
  if (input.home_area !== undefined) updateFields.home_area = input.home_area;
  if (input.activity_day !== undefined)
    updateFields.activity_day = input.activity_day;

  if (Object.keys(updateFields).length === 0) {
    return NextResponse.json(apiSuccess(before, []));
  }

  const { data, error } = await supabase
    .from("teams")
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
    actor_id: authResult.id,
    action: "UPDATE_TEAM",
    target_type: "team",
    target_id: id,
    before_json: before,
    after_json: data,
  });

  return NextResponse.json(apiSuccess(data, []));
}
