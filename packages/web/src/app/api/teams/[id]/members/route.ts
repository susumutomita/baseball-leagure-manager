import { requireAuth, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  createMemberSchema,
  writeAuditLog,
  zodToValidationError,
} from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** GET /api/teams/:id/members — メンバー一覧 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("team_id", id)
    .order("role", { ascending: true })
    .order("name", { ascending: true });

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

/** POST /api/teams/:id/members — メンバー追加 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const roleCheck = requireRole(authResult, "ADMIN");
  if (roleCheck) return roleCheck;

  const { id: teamId } = await params;
  const supabase = await createClient();
  const body = await request.json();

  const parsed = createMemberSchema.safeParse({ ...body, team_id: teamId });
  if (!parsed.success) {
    const ve = zodToValidationError(parsed.error);
    return NextResponse.json(
      apiError("VALIDATION_ERROR", ve.issues.map((i) => i.message).join("; ")),
      { status: 400 },
    );
  }

  const input = parsed.data;
  const { data, error } = await supabase
    .from("members")
    .insert({
      team_id: input.team_id,
      name: input.name,
      tier: input.tier,
      role: input.role,
      line_user_id: input.line_user_id,
      email: input.email,
      positions_json: input.positions_json,
      jersey_number: input.jersey_number,
      status: "ACTIVE",
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
    actor_id: authResult.id,
    action: "CREATE_MEMBER",
    target_type: "member",
    target_id: data.id,
    after_json: data,
  });

  return NextResponse.json(apiSuccess(data), { status: 201 });
}
