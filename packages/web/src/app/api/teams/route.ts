import { createClient } from "@/lib/supabase/server";
import { createTeamSchema } from "@/lib/validations";
import { writeAuditLog } from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** POST /api/teams — チーム作成 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  const parsed = createTeamSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("teams")
    .insert({
      name: parsed.data.name,
      home_area: parsed.data.home_area,
      level_band: parsed.data.level_band,
      payment_method: parsed.data.payment_method ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await writeAuditLog(supabase, {
    actor_type: "USER",
    actor_id: data.id,
    action: "CREATE_TEAM",
    target_type: "team",
    target_id: data.id,
    after_json: data,
  });

  return NextResponse.json(data, { status: 201 });
}

/** GET /api/teams — チーム一覧 */
export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
