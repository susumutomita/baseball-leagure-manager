import { requireAuth, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  createGroundSchema,
  updateGroundWatchSchema,
  writeAuditLog,
  zodToValidationError,
} from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** GET /api/grounds?team_id=xxx&watch_active=true */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get("team_id");
  const watchActive = searchParams.get("watch_active");

  let query = supabase
    .from("grounds")
    .select("*")
    .order("name", { ascending: true });

  if (teamId) query = query.eq("team_id", teamId);
  if (watchActive !== null && watchActive !== undefined) {
    query = query.eq("watch_active", watchActive === "true");
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(apiError("DATABASE_ERROR", error.message), {
      status: 400,
    });
  }

  return NextResponse.json(apiSuccess(data ?? [], []));
}

/** POST /api/grounds — グラウンド登録 / 監視設定更新 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const roleCheck = requireRole(authResult, "ADMIN");
  if (roleCheck) return roleCheck;

  const supabase = await createClient();
  const body = await request.json();

  // ground_id が指定されていれば監視設定の更新
  if (body.ground_id) {
    const parsed = updateGroundWatchSchema.safeParse(body);
    if (!parsed.success) {
      const ve = zodToValidationError(parsed.error);
      return NextResponse.json(
        apiError(
          "VALIDATION_ERROR",
          ve.issues.map((i) => i.message).join("; "),
        ),
        { status: 400 },
      );
    }

    const input = parsed.data;
    const { data, error } = await supabase
      .from("grounds")
      .update({
        watch_active: input.watch_active,
        conditions_json: input.conditions_json,
      })
      .eq("id", body.ground_id)
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
      action: "UPDATE_GROUND_WATCH",
      target_type: "ground",
      target_id: body.ground_id,
      after_json: { watch_active: input.watch_active },
    });

    return NextResponse.json(apiSuccess(data, []));
  }

  // 新規グラウンド登録
  const parsed = createGroundSchema.safeParse(body);
  if (!parsed.success) {
    const ve = zodToValidationError(parsed.error);
    return NextResponse.json(
      apiError("VALIDATION_ERROR", ve.issues.map((i) => i.message).join("; ")),
      { status: 400 },
    );
  }

  const input = parsed.data;
  const { data, error } = await supabase
    .from("grounds")
    .insert({
      team_id: input.team_id,
      name: input.name,
      municipality: input.municipality,
      source_url: input.source_url,
      cost_per_slot: input.cost_per_slot,
      is_hardball_ok: input.is_hardball_ok,
      has_night_lights: input.has_night_lights,
      note: input.note,
      watch_active: false,
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
    action: "CREATE_GROUND",
    target_type: "ground",
    target_id: data.id,
    after_json: data,
  });

  return NextResponse.json(
    apiSuccess(data, [
      {
        action: "update_ground_watch",
        reason:
          "グラウンドが登録されました。空き監視を有効にするには watch_active を設定してください",
        priority: "low",
        suggested_params: { ground_id: data.id },
      },
    ]),
    { status: 201 },
  );
}
