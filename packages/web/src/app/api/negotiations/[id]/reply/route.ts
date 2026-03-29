import { createServerClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@match-engine/core";
import { assertNegotiationTransition } from "@match-engine/core";
import type { NegotiationStatus } from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** PATCH /api/negotiations/:id/reply — 交渉に回答 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServerClient();
  const body = await request.json();

  const { data: negotiation, error: fetchError } = await supabase
    .from("negotiations")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 404 });
  }

  const newStatus = body.status as NegotiationStatus;
  try {
    assertNegotiationTransition(
      negotiation.status as NegotiationStatus,
      newStatus,
    );
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 422 });
  }

  const { data, error } = await supabase
    .from("negotiations")
    .update({
      status: newStatus,
      reply_message: body.reply_message ?? null,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await writeAuditLog(supabase, {
    actor_type: "USER",
    actor_id: body.actor_id ?? "SYSTEM",
    action: "REPLY_NEGOTIATION",
    target_type: "negotiation",
    target_id: id,
    before_json: { status: negotiation.status },
    after_json: { status: newStatus },
  });

  return NextResponse.json(data);
}
