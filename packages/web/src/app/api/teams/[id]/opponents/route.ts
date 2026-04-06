import { requireAuth, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  createOpponentTeamSchema,
  zodToValidationError,
} from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** GET /api/teams/:id/opponents — 対戦相手一覧 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("opponent_teams")
    .select("*")
    .eq("team_id", id)
    .order("times_played", { ascending: false });

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

/** POST /api/teams/:id/opponents — 対戦相手追加 */
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

  const parsed = createOpponentTeamSchema.safeParse({
    ...body,
    team_id: teamId,
  });
  if (!parsed.success) {
    const ve = zodToValidationError(parsed.error);
    return NextResponse.json(
      apiError("VALIDATION_ERROR", ve.issues.map((i) => i.message).join("; ")),
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("opponent_teams")
    .insert(parsed.data)
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

  return NextResponse.json(apiSuccess(data), { status: 201 });
}
