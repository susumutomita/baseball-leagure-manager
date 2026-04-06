import { createClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  respondRsvpSchema,
  validateRsvpToken,
  zodToValidationError,
} from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** PATCH /api/rsvps/:id/web — トークンベースのRSVP回答（認証不要） */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: rsvpId } = await params;
  const supabase = await createClient();
  const body = await request.json();

  // トークン検証
  const token = body.token as string;
  if (!token) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "トークンが必要です"),
      { status: 400 },
    );
  }

  const validation = validateRsvpToken(token);
  if (!validation.valid || !validation.payload) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", validation.reason ?? "トークンが無効です"),
      { status: 400 },
    );
  }

  // トークンのrsvpIdとURLのrsvpIdが一致するか
  if (validation.payload.rsvpId !== rsvpId) {
    return NextResponse.json(apiError("VALIDATION_ERROR", "トークン不一致"), {
      status: 400,
    });
  }

  // 回答のバリデーション
  const parsed = respondRsvpSchema.safeParse({
    response: body.response,
    channel: "WEB",
  });
  if (!parsed.success) {
    const ve = zodToValidationError(parsed.error);
    return NextResponse.json(
      apiError("VALIDATION_ERROR", ve.issues.map((i) => i.message).join("; ")),
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("rsvps")
    .update({
      response: parsed.data.response,
      response_channel: "WEB",
      responded_at: new Date().toISOString(),
    })
    .eq("id", rsvpId)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json(apiError("NOT_FOUND", "RSVPが見つかりません"), {
      status: 404,
    });
  }

  return NextResponse.json(apiSuccess(data));
}
