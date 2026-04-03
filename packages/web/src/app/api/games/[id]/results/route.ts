import { requireAuth, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess, writeAuditLog } from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** POST /api/games/:id/results — 試合結果登録 */
export async function POST(
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

  const { data, error } = await supabase
    .from("game_results")
    .upsert(
      {
        game_id: id,
        our_score: body.our_score ?? null,
        opponent_score: body.opponent_score ?? null,
        result: body.result ?? null,
        innings: body.innings ?? 7,
        note: body.note ?? null,
      },
      { onConflict: "game_id" },
    )
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
    action: "RECORD_GAME_RESULT",
    target_type: "game_result",
    target_id: data.id,
    after_json: data,
  });

  return NextResponse.json(apiSuccess(data, []), { status: 201 });
}

/** GET /api/games/:id/results — 試合結果取得 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("game_results")
    .select("*")
    .eq("game_id", id)
    .single();

  if (error) {
    return NextResponse.json(apiError("NOT_FOUND", "試合結果がありません"), {
      status: 404,
    });
  }

  return NextResponse.json(apiSuccess(data, []));
}
