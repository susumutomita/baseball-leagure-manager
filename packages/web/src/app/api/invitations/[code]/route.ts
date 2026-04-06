import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** GET /api/invitations/:code — 招待コード検証 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("team_invitations")
    .select("*")
    .eq("invite_code", code)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    return NextResponse.json(
      apiError("NOT_FOUND", "招待コードが見つかりません"),
      { status: 404 },
    );
  }

  // 期限切れチェック
  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "招待コードの有効期限が切れています"),
      { status: 400 },
    );
  }

  // 使用回数チェック
  if (data.max_uses !== null && data.use_count >= data.max_uses) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "招待コードの使用回数上限に達しています"),
      { status: 400 },
    );
  }

  return NextResponse.json(apiSuccess(data));
}

/** POST /api/invitations/:code — 招待コード使用 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> },
) {
  const { code } = await params;
  const supabase = await createClient();
  const body = await request.json();

  const { data: invitation, error: fetchError } = await supabase
    .from("team_invitations")
    .select("*")
    .eq("invite_code", code)
    .eq("is_active", true)
    .single();

  if (fetchError || !invitation) {
    return NextResponse.json(
      apiError("NOT_FOUND", "招待コードが見つかりません"),
      { status: 404 },
    );
  }

  // use_count をインクリメント
  const { error: updateError } = await supabase
    .from("team_invitations")
    .update({ use_count: invitation.use_count + 1 })
    .eq("id", invitation.id);

  if (updateError) {
    return NextResponse.json(apiError("DATABASE_ERROR", updateError.message), {
      status: 400,
    });
  }

  // 使用記録
  await supabase.from("invitation_uses").insert({
    invitation_id: invitation.id,
    used_by_user_id: body.user_id ?? null,
    used_by_team_id: body.team_id ?? null,
  });

  return NextResponse.json(apiSuccess({ invitation, accepted: true }));
}
