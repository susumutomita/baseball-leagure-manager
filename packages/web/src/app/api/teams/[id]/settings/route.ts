import { requireAuth, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  updateTeamRsvpSettingsSchema,
  zodToValidationError,
} from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** PATCH /api/teams/:id/settings — チームRSVP設定更新 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const roleCheck = requireRole(authResult, "ADMIN");
  if (roleCheck) return roleCheck;

  const { id: teamId } = await params;
  const supabase = await createClient();
  const body = await request.json();

  const parsed = updateTeamRsvpSettingsSchema.safeParse(body);
  if (!parsed.success) {
    const ve = zodToValidationError(parsed.error);
    return NextResponse.json(
      apiError("VALIDATION_ERROR", ve.issues.map((i) => i.message).join("; ")),
      { status: 400 },
    );
  }

  // 現在の settings_json を取得
  const { data: team, error: fetchError } = await supabase
    .from("teams")
    .select("settings_json")
    .eq("id", teamId)
    .single();

  if (fetchError || !team) {
    return NextResponse.json(apiError("NOT_FOUND", "チームが見つかりません"), {
      status: 404,
    });
  }

  const currentSettings = (team.settings_json ?? {}) as Record<string, unknown>;
  const updatedSettings = {
    ...currentSettings,
    rsvp: {
      ...((currentSettings.rsvp as Record<string, unknown>) ?? {}),
      ...parsed.data,
    },
  };

  const { data, error } = await supabase
    .from("teams")
    .update({ settings_json: updatedSettings })
    .eq("id", teamId)
    .select()
    .single();

  if (error) {
    return NextResponse.json(apiError("DATABASE_ERROR", error.message), {
      status: 400,
    });
  }

  return NextResponse.json(apiSuccess(data));
}
