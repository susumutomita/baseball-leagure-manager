import { requireAuth, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess, writeAuditLog } from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";
import { z } from "zod/v4";

const pitchingStatSchema = z.object({
  member_id: z.string().uuid("member_id は有効な UUID である必要があります"),
  role: z.enum(["STARTER", "RELIEVER", "CLOSER"]),
  innings_pitched: z
    .number()
    .min(0, "innings_pitched は 0 以上です")
    .max(99.9, "innings_pitched は 99.9 以下です"),
  hits_allowed: z.number().int().min(0).default(0),
  runs_allowed: z.number().int().min(0).default(0),
  earned_runs: z.number().int().min(0).default(0),
  strikeouts: z.number().int().min(0).default(0),
  walks: z.number().int().min(0).default(0),
  hit_batters: z.number().int().min(0).default(0),
  home_runs_allowed: z.number().int().min(0).default(0),
  is_winning_pitcher: z.boolean().default(false),
  is_losing_pitcher: z.boolean().default(false),
  note: z.string().nullish(),
});

/** GET /api/games/:id/pitching — 投球成績取得 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("pitching_stats")
    .select("*, members:member_id(name)")
    .eq("game_id", id)
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json(apiError("DATABASE_ERROR", error.message), {
      status: 400,
    });
  }

  return NextResponse.json(apiSuccess(data ?? [], []));
}

/** POST /api/games/:id/pitching — 投球成績登録 */
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

  const parsed = pitchingStatSchema.safeParse(body);
  if (!parsed.success) {
    const messages = parsed.error.issues.map((i) => i.message).join("; ");
    return NextResponse.json(apiError("VALIDATION_ERROR", messages), {
      status: 400,
    });
  }

  const input = parsed.data;

  const { data, error } = await supabase
    .from("pitching_stats")
    .insert({
      game_id: id,
      member_id: input.member_id,
      role: input.role,
      innings_pitched: input.innings_pitched,
      hits_allowed: input.hits_allowed,
      runs_allowed: input.runs_allowed,
      earned_runs: input.earned_runs,
      strikeouts: input.strikeouts,
      walks: input.walks,
      hit_batters: input.hit_batters,
      home_runs_allowed: input.home_runs_allowed,
      is_winning_pitcher: input.is_winning_pitcher,
      is_losing_pitcher: input.is_losing_pitcher,
      note: input.note ?? null,
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
    action: "RECORD_PITCHING_STAT",
    target_type: "pitching_stat",
    target_id: data.id,
    after_json: data,
  });

  return NextResponse.json(apiSuccess(data, []), { status: 201 });
}

/** DELETE /api/games/:id/pitching — 投球成績削除 */
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
  const statId = searchParams.get("stat_id");

  if (!statId) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "stat_id は必須です"),
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("pitching_stats")
    .delete()
    .eq("id", statId)
    .eq("game_id", id);

  if (error) {
    return NextResponse.json(apiError("DATABASE_ERROR", error.message), {
      status: 400,
    });
  }

  return NextResponse.json(apiSuccess(null, []));
}
