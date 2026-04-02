import { requireAuth } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  respondRsvpSchema,
  writeAuditLog,
  zodToValidationError,
} from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** PATCH /api/rsvps/:id — 出欠回答 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();

  const parsed = respondRsvpSchema.safeParse(body);
  if (!parsed.success) {
    const ve = zodToValidationError(parsed.error);
    return NextResponse.json(
      apiError("VALIDATION_ERROR", ve.issues.map((i) => i.message).join("; "), [
        {
          action: "respond_rsvp",
          reason: "response は AVAILABLE, UNAVAILABLE, MAYBE のいずれかです",
          priority: "high",
        },
      ]),
      { status: 400 },
    );
  }

  const input = parsed.data;

  const { data: before, error: fetchError } = await supabase
    .from("rsvps")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError) {
    return NextResponse.json(
      apiError("NOT_FOUND", "出欠レコードが見つかりません"),
      { status: 404 },
    );
  }

  const { data, error } = await supabase
    .from("rsvps")
    .update({
      response: input.response,
      responded_at: new Date().toISOString(),
      response_channel: input.channel,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(apiError("DATABASE_ERROR", error.message), {
      status: 400,
    });
  }

  await writeAuditLog(supabase, {
    actor_type: "USER",
    actor_id: before.member_id,
    action: "RESPOND_RSVP",
    target_type: "rsvp",
    target_id: id,
    before_json: { response: before.response },
    after_json: { response: input.response },
  });

  return NextResponse.json(
    apiSuccess(data, [
      {
        action: "get_rsvps",
        reason: "出欠状況の全体を確認してください",
        priority: "low",
        suggested_params: { game_id: before.game_id },
      },
    ]),
  );
}
