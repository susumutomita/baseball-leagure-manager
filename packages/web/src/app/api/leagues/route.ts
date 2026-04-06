import { requireAuth, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  createLeagueSchema,
  zodToValidationError,
} from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** POST /api/leagues — リーグ作成 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const roleCheck = requireRole(authResult, "ADMIN");
  if (roleCheck) return roleCheck;

  const supabase = await createClient();
  const body = await request.json();
  const parsed = createLeagueSchema.safeParse(body);

  if (!parsed.success) {
    const ve = zodToValidationError(parsed.error);
    return NextResponse.json(
      apiError("VALIDATION_ERROR", ve.issues.map((i) => i.message).join("; ")),
      { status: 400 },
    );
  }

  const input = parsed.data;
  const { data, error } = await supabase
    .from("leagues")
    .insert({
      name: input.name,
      season: input.season,
      area: input.area,
      format: input.format,
      organizer_user_id: input.organizer_user_id,
      max_teams: input.max_teams,
      status: "DRAFT",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(apiError("DATABASE_ERROR", error.message), {
      status: 400,
    });
  }

  return NextResponse.json(apiSuccess(data), { status: 201 });
}

/** GET /api/leagues?organizer_user_id=xxx */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const organizerUserId = searchParams.get("organizer_user_id");
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 100);

  let query = supabase
    .from("leagues")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (organizerUserId) {
    query = query.eq("organizer_user_id", organizerUserId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(apiError("DATABASE_ERROR", error.message), {
      status: 400,
    });
  }

  return NextResponse.json(apiSuccess(data ?? []));
}
