import { createServerClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@match-engine/core";
import { assertTransition } from "@match-engine/core";
import type { MatchRequestStatus } from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** POST /api/match-requests/:id/open — DRAFT → OPEN */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data: mr, error: fetchError } = await supabase
    .from("match_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 404 });
  }

  try {
    assertTransition(mr.status as MatchRequestStatus, "OPEN");
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 422 });
  }

  const { data, error } = await supabase
    .from("match_requests")
    .update({ status: "OPEN" })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await writeAuditLog(supabase, {
    actor_type: "USER",
    actor_id: mr.team_id,
    action: "TRANSITION_MATCH_REQUEST",
    target_type: "match_request",
    target_id: id,
    before_json: { status: mr.status },
    after_json: { status: "OPEN" },
  });

  return NextResponse.json(data);
}
