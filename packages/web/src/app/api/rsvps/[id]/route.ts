import { createClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** PATCH /api/rsvps/:id — 出欠回答 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();

  const validResponses = ["AVAILABLE", "UNAVAILABLE", "MAYBE"];
  if (!validResponses.includes(body.response)) {
    return NextResponse.json(
      { error: `response は ${validResponses.join(", ")} のいずれかです` },
      { status: 400 },
    );
  }

  const { data: before, error: fetchError } = await supabase
    .from("rsvps")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 404 });
  }

  const { data, error } = await supabase
    .from("rsvps")
    .update({
      response: body.response,
      responded_at: new Date().toISOString(),
      response_channel: body.channel ?? "WEB",
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await writeAuditLog(supabase, {
    actor_type: "USER",
    actor_id: before.member_id,
    action: "RESPOND_RSVP",
    target_type: "rsvp",
    target_id: id,
    before_json: { response: before.response },
    after_json: { response: body.response },
  });

  return NextResponse.json(data);
}
