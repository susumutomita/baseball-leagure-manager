import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  updateTeamProfileSchema,
  zodToValidationError,
} from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** GET /api/teams/:id/profile — チームプロフィール取得 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: teamId } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("team_profiles")
    .select("*")
    .eq("team_id", teamId)
    .single();

  if (error || !data) {
    return NextResponse.json(
      apiError("NOT_FOUND", "プロフィールが見つかりません"),
      { status: 404 },
    );
  }

  return NextResponse.json(apiSuccess(data));
}

/** PUT /api/teams/:id/profile — チームプロフィール更新 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  const { id: teamId } = await params;
  const supabase = await createClient();
  const body = await request.json();

  const parsed = updateTeamProfileSchema.safeParse(body);
  if (!parsed.success) {
    const ve = zodToValidationError(parsed.error);
    return NextResponse.json(
      apiError("VALIDATION_ERROR", ve.issues.map((i) => i.message).join("; ")),
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("team_profiles")
    .upsert({ team_id: teamId, ...parsed.data }, { onConflict: "team_id" })
    .select()
    .single();

  if (error) {
    return NextResponse.json(apiError("DATABASE_ERROR", error.message), {
      status: 400,
    });
  }

  return NextResponse.json(apiSuccess(data));
}
