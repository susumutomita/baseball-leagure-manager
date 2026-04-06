import { requireAuth, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** POST /api/leagues/:id/teams — チーム招待 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const roleCheck = requireRole(authResult, "ADMIN");
  if (roleCheck) return roleCheck;

  const { id: leagueId } = await params;
  const supabase = await createClient();
  const body = await request.json();
  const teamId = body.team_id;

  if (!teamId) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "team_idは必須です"),
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("league_teams")
    .insert({ league_id: leagueId, team_id: teamId, status: "INVITED" })
    .select()
    .single();

  if (error) {
    return NextResponse.json(apiError("DATABASE_ERROR", error.message), {
      status: 400,
    });
  }

  return NextResponse.json(apiSuccess(data), { status: 201 });
}

/** GET /api/leagues/:id/teams — 参加チーム一覧 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: leagueId } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("league_teams")
    .select("*")
    .eq("league_id", leagueId)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json(apiError("DATABASE_ERROR", error.message), {
      status: 400,
    });
  }

  return NextResponse.json(apiSuccess(data ?? []));
}
