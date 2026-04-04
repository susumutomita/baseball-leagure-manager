import { requireAuth, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess, writeAuditLog } from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

const VALID_RESULTS = [
  "SINGLE",
  "DOUBLE",
  "TRIPLE",
  "HOMERUN",
  "GROUND_OUT",
  "FLY_OUT",
  "LINE_OUT",
  "STRIKEOUT",
  "DOUBLE_PLAY",
  "FIELDERS_CHOICE",
  "ERROR",
  "WALK",
  "HIT_BY_PITCH",
  "SAC_BUNT",
  "SAC_FLY",
] as const;

/** POST /api/games/:id/at-bats — 打席結果登録 */
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

  // Validate game exists
  const { error: gameError } = await supabase
    .from("games")
    .select("id")
    .eq("id", id)
    .single();

  if (gameError) {
    return NextResponse.json(apiError("NOT_FOUND", "試合が見つかりません"), {
      status: 404,
    });
  }

  const atBat = body;
  if (!atBat.member_id || !atBat.inning || !atBat.result) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "member_id, inning, result は必須です"),
      { status: 400 },
    );
  }

  if (!VALID_RESULTS.includes(atBat.result)) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", `無効な結果: ${atBat.result}`),
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("at_bats")
    .insert({
      game_id: id,
      member_id: atBat.member_id,
      inning: atBat.inning,
      batting_order: atBat.batting_order ?? null,
      result: atBat.result,
      rbi: atBat.rbi ?? 0,
      note: atBat.note ?? null,
    })
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
    action: "RECORD_AT_BAT",
    target_type: "at_bat",
    target_id: data.id,
    after_json: data,
  });

  return NextResponse.json(apiSuccess(data, []), { status: 201 });
}

/** GET /api/games/:id/at-bats — 打席結果取得 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("at_bats")
    .select("*, members:member_id(name)")
    .eq("game_id", id)
    .order("inning", { ascending: true })
    .order("batting_order", { ascending: true });

  if (error) {
    return NextResponse.json(apiError("DATABASE_ERROR", error.message), {
      status: 400,
    });
  }

  return NextResponse.json(apiSuccess(data ?? [], []));
}

/** DELETE /api/games/:id/at-bats — 打席結果削除 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const roleCheck = requireRole(authResult, "ADMIN");
  if (roleCheck) return roleCheck;

  const { id } = await params;
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const atBatId = searchParams.get("at_bat_id");

  if (!atBatId) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "at_bat_id は必須です"),
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("at_bats")
    .delete()
    .eq("id", atBatId)
    .eq("game_id", id);

  if (error) {
    return NextResponse.json(apiError("DATABASE_ERROR", error.message), {
      status: 400,
    });
  }

  return NextResponse.json(apiSuccess(null, []));
}
