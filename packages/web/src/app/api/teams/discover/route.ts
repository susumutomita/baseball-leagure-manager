import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** GET /api/teams/discover — 公開チーム検索 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);

  const area = searchParams.get("area");
  const skillLevel = searchParams.get("skill_level");
  const lookingForOpponents = searchParams.get("looking_for_opponents");
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 100);

  let query = supabase
    .from("team_profiles")
    .select("*")
    .eq("is_public", true)
    .order("member_count", { ascending: false })
    .limit(limit);

  if (area) query = query.eq("activity_area", area);
  if (skillLevel) query = query.eq("skill_level", skillLevel);
  if (lookingForOpponents === "true")
    query = query.eq("looking_for_opponents", true);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(apiError("DATABASE_ERROR", error.message), {
      status: 400,
    });
  }

  return NextResponse.json(apiSuccess(data ?? []));
}
