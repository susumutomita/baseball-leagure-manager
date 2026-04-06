import { requireAuth, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  createHelperSchema,
  writeAuditLog,
  zodToValidationError,
} from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** POST /api/helpers — 助っ人登録 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const roleCheck = requireRole(authResult, "ADMIN");
  if (roleCheck) return roleCheck;

  const supabase = await createClient();
  const body = await request.json();

  const parsed = createHelperSchema.safeParse(body);
  if (!parsed.success) {
    const ve = zodToValidationError(parsed.error);
    return NextResponse.json(
      apiError("VALIDATION_ERROR", ve.issues.map((i) => i.message).join("; ")),
      { status: 400 },
    );
  }

  const input = parsed.data;
  const { data, error } = await supabase
    .from("helpers")
    .insert({
      team_id: input.team_id,
      name: input.name,
      line_user_id: input.line_user_id,
      email: input.email,
      note: input.note,
    })
    .select()
    .single();

  if (error) {
    console.error("DATABASE_ERROR:", error.message);
    return NextResponse.json(
      apiError("DATABASE_ERROR", "データベースエラーが発生しました"),
      {
        status: 400,
      },
    );
  }

  await writeAuditLog(supabase, {
    actor_type: "USER",
    actor_id: input.team_id,
    action: "CREATE_HELPER",
    target_type: "helper",
    target_id: data.id,
    after_json: data,
  });

  return NextResponse.json(
    apiSuccess(data, [
      {
        action: "create_helper_requests",
        reason: "助っ人が登録されました。試合への打診ができます",
        priority: "low",
      },
    ]),
    { status: 201 },
  );
}

/** GET /api/helpers?team_id=xxx */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get("team_id");

  let query = supabase
    .from("helpers")
    .select("*")
    .order("reliability_score", { ascending: false });

  if (teamId) {
    query = query.eq("team_id", teamId);
  }

  const { data, error } = await query;

  if (error) {
    console.error("DATABASE_ERROR:", error.message);
    return NextResponse.json(
      apiError("DATABASE_ERROR", "データベースエラーが発生しました"),
      {
        status: 400,
      },
    );
  }

  return NextResponse.json(apiSuccess(data ?? [], []));
}
