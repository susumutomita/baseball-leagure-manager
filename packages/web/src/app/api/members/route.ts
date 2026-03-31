import { createClient } from "@/lib/supabase/server";
import { createMemberSchema } from "@/lib/validations";
import { writeAuditLog } from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** POST /api/members — メンバー追加 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const body = await request.json();

  const parsed = createMemberSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0].message },
      { status: 400 },
    );
  }

  const { data: member, error } = await supabase
    .from("members")
    .insert({
      team_id: parsed.data.team_id,
      name: parsed.data.name,
      tier: parsed.data.tier,
      email: parsed.data.email || null,
      positions_json: parsed.data.positions_json,
      jersey_number: parsed.data.jersey_number ?? null,
      status: "ACTIVE",
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await writeAuditLog(supabase, {
    actor_type: "USER",
    actor_id: member.id,
    action: "ADD_MEMBER",
    target_type: "member",
    target_id: member.id,
    after_json: member,
  });

  return NextResponse.json(member, { status: 201 });
}

/** GET /api/members?team_id=xxx — メンバー一覧 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const teamId = request.nextUrl.searchParams.get("team_id");

  if (!teamId) {
    return NextResponse.json({ error: "team_id は必須です" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("members")
    .select("*")
    .eq("team_id", teamId)
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
