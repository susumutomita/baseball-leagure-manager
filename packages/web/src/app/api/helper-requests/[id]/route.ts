import { createClient } from "@/lib/supabase/server";
import {
  assertHelperRequestTransition,
  writeAuditLog,
} from "@match-engine/core";
import type { HelperRequestStatus } from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** PATCH /api/helper-requests/:id — 助っ人打診への回答 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();

  const { data: hr, error: fetchError } = await supabase
    .from("helper_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 404 });
  }

  const newStatus = body.status as HelperRequestStatus;
  try {
    assertHelperRequestTransition(hr.status as HelperRequestStatus, newStatus);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 422 });
  }

  const updateFields: Record<string, unknown> = { status: newStatus };
  if (newStatus === "ACCEPTED" || newStatus === "DECLINED") {
    updateFields.responded_at = new Date().toISOString();
  }
  if (newStatus === "CANCELLED") {
    updateFields.cancelled_at = new Date().toISOString();
    updateFields.cancel_reason = body.cancel_reason ?? "FULFILLED";
  }

  const { data, error } = await supabase
    .from("helper_requests")
    .update(updateFields)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await writeAuditLog(supabase, {
    actor_type: "USER",
    actor_id: body.actor_id ?? "SYSTEM",
    action: `HELPER_REQUEST:${hr.status}→${newStatus}`,
    target_type: "helper_request",
    target_id: id,
    before_json: { status: hr.status },
    after_json: { status: newStatus },
  });

  return NextResponse.json(data);
}
