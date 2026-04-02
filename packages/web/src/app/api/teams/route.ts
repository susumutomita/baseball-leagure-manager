import { createClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  createTeamSchema,
  writeAuditLog,
  zodToValidationError,
} from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** POST /api/teams — チーム作成 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  const parsed = createTeamSchema.safeParse(body);
  if (!parsed.success) {
    const ve = zodToValidationError(parsed.error);
    return NextResponse.json(
      apiError("VALIDATION_ERROR", ve.issues.map((i) => i.message).join("; ")),
      { status: 400 },
    );
  }

  const input = parsed.data;
  const { data, error } = await supabase
    .from("teams")
    .insert({
      name: input.name,
      home_area: input.home_area,
      activity_day: input.activity_day,
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
    actor_id: data.id,
    action: "CREATE_TEAM",
    target_type: "team",
    target_id: data.id,
    after_json: data,
  });

  return NextResponse.json(
    apiSuccess(data, [
      {
        action: "create_game",
        reason: "チームが作成されました。試合を作成してください",
        priority: "medium",
        suggested_params: { team_id: data.id },
      },
    ]),
    { status: 201 },
  );
}

/** GET /api/teams — チーム一覧 */
export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(apiError("DATABASE_ERROR", error.message), {
      status: 400,
    });
  }

  return NextResponse.json(apiSuccess(data ?? [], []));
}
