import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  recordMatchResultSchema,
  zodToValidationError,
} from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** POST /api/leagues/:id/matches/:matchId/result — 試合結果記録 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; matchId: string }> },
) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  const { matchId } = await params;
  const supabase = await createClient();
  const body = await request.json();

  const parsed = recordMatchResultSchema.safeParse(body);
  if (!parsed.success) {
    const ve = zodToValidationError(parsed.error);
    return NextResponse.json(
      apiError("VALIDATION_ERROR", ve.issues.map((i) => i.message).join("; ")),
      { status: 400 },
    );
  }

  const { home_score, away_score } = parsed.data;

  const { data, error } = await supabase
    .from("league_matches")
    .update({
      home_score,
      away_score,
      status: "COMPLETED",
    })
    .eq("id", matchId)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json(apiError("NOT_FOUND", "試合が見つかりません"), {
      status: 404,
    });
  }

  return NextResponse.json(apiSuccess(data));
}
