import { requireAuth, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess, writeAuditLog } from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** POST /api/games/:id/attendances — 出席記録保存 */
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

  // Validate game exists and is in correct status
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, status")
    .eq("id", id)
    .single();

  if (gameError || !game) {
    return NextResponse.json(apiError("NOT_FOUND", "試合が見つかりません"), {
      status: 404,
    });
  }

  if (game.status !== "CONFIRMED" && game.status !== "COMPLETED") {
    return NextResponse.json(
      apiError(
        "VALIDATION_ERROR",
        "出席記録は確定済みまたは完了済みの試合のみ可能です",
      ),
      { status: 400 },
    );
  }

  const attendances = body.attendances;
  if (!Array.isArray(attendances) || attendances.length === 0) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "attendances は必須です"),
      { status: 400 },
    );
  }

  // Validate each attendance entry
  const validStatuses = ["ATTENDED", "NO_SHOW", "CANCELLED_SAME_DAY"];
  const validPersonTypes = ["MEMBER", "HELPER"];
  for (const a of attendances) {
    if (!validStatuses.includes(a.status)) {
      return NextResponse.json(
        apiError("VALIDATION_ERROR", `無効なステータス: ${a.status}`),
        { status: 400 },
      );
    }
    if (!validPersonTypes.includes(a.person_type)) {
      return NextResponse.json(
        apiError("VALIDATION_ERROR", `無効な person_type: ${a.person_type}`),
        { status: 400 },
      );
    }
  }

  const rows = attendances.map(
    (a: { person_type: string; person_id: string; status: string }) => ({
      game_id: id,
      person_type: a.person_type,
      person_id: a.person_id,
      status: a.status,
      recorded_at: new Date().toISOString(),
      recorded_by: authResult.id,
    }),
  );

  // Upsert (unique on game_id, person_type, person_id)
  const { data, error } = await supabase
    .from("attendances")
    .upsert(rows, { onConflict: "game_id,person_type,person_id" })
    .select();

  if (error) {
    return NextResponse.json(apiError("DATABASE_ERROR", error.message), {
      status: 400,
    });
  }

  await writeAuditLog(supabase, {
    actor_type: "USER",
    actor_id: authResult.id,
    action: "RECORD_ATTENDANCES",
    target_type: "game",
    target_id: id,
    after_json: { count: data?.length ?? 0 },
  });

  return NextResponse.json(apiSuccess(data ?? [], []), { status: 201 });
}

/** GET /api/games/:id/attendances — 出席記録取得 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("attendances")
    .select("*")
    .eq("game_id", id);

  if (error) {
    return NextResponse.json(apiError("DATABASE_ERROR", error.message), {
      status: 400,
    });
  }

  return NextResponse.json(apiSuccess(data ?? [], []));
}
