import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit";

/** POST /api/teams — チーム作成 */
export async function POST(request: NextRequest) {
  const supabase = createServerClient();
  const body = await request.json();

  const { data, error } = await supabase
    .from("teams")
    .insert({
      name: body.name,
      home_area: body.home_area,
      level_band: body.level_band,
      payment_method: body.payment_method ?? null,
      policy_json: body.policy_json ?? null,
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
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
