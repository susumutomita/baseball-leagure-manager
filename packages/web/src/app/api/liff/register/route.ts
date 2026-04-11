import {
  extractToken,
  isVerifyError,
  verifyLiffToken,
} from "@/lib/liff/verify";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/** POST /api/liff/register — LINE ID をメンバーに紐付け */
export async function POST(request: Request) {
  const token = extractToken(request);
  if (!token) {
    return NextResponse.json(
      { error: "Authorization header required" },
      { status: 401 },
    );
  }

  const result = await verifyLiffToken(token);
  if (isVerifyError(result)) {
    return NextResponse.json({ error: result.error }, { status: 403 });
  }

  const body = (await request.json()) as {
    member_id?: string;
    invite_code?: string | null;
  };
  if (!body.member_id) {
    return NextResponse.json(
      { error: "member_id is required" },
      { status: 400 },
    );
  }

  const supabase = await createClient();

  let invitation: {
    id: string;
    team_id: string;
    use_count: number;
    max_uses: number | null;
    expires_at: string | null;
  } | null = null;

  if (body.invite_code) {
    const { data: inviteData, error: invitationFetchError } = await supabase
      .from("team_invitations")
      .select("id, team_id, use_count, max_uses, expires_at")
      .eq("invite_code", body.invite_code)
      .eq("is_active", true)
      .maybeSingle();

    if (invitationFetchError) {
      return NextResponse.json(
        { error: invitationFetchError.message },
        { status: 500 },
      );
    }

    if (!inviteData) {
      return NextResponse.json(
        { error: "招待コードが無効です" },
        { status: 404 },
      );
    }

    if (inviteData.expires_at && new Date(inviteData.expires_at) < new Date()) {
      return NextResponse.json(
        { error: "招待コードの有効期限が切れています" },
        { status: 400 },
      );
    }

    if (
      inviteData.max_uses !== null &&
      inviteData.use_count >= inviteData.max_uses
    ) {
      return NextResponse.json(
        { error: "招待コードの使用回数上限に達しています" },
        { status: 400 },
      );
    }

    invitation = inviteData;
  }

  // 既に他のメンバーに紐付いていないか確認
  const { data: existing } = await supabase
    .from("members")
    .select("id, name")
    .eq("line_user_id", result.lineUserId)
    .single();

  if (existing) {
    return NextResponse.json(
      {
        error: "Already linked",
        linkedMember: { id: existing.id, name: existing.name },
      },
      { status: 409 },
    );
  }

  // 対象メンバーが既に別のLINE IDを持っていないか確認
  const { data: target } = await supabase
    .from("members")
    .select("id, name, line_user_id, team_id")
    .eq("id", body.member_id)
    .single();

  if (!target) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
  }

  if (invitation && invitation.team_id !== target.team_id) {
    return NextResponse.json(
      { error: "招待されたチームのメンバーのみ登録できます" },
      { status: 403 },
    );
  }

  if (target.line_user_id) {
    return NextResponse.json(
      { error: "Member already linked to another LINE account" },
      { status: 409 },
    );
  }

  // 紐付け実行
  const { error } = await supabase
    .from("members")
    .update({ line_user_id: result.lineUserId })
    .eq("id", body.member_id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (invitation) {
    const { data: consumedInvitations, error: invitationError } = await supabase
      .from("team_invitations")
      .update({ use_count: invitation.use_count + 1 })
      .eq("id", invitation.id)
      .eq("use_count", invitation.use_count)
      .select("id");

    if (invitationError) {
      return NextResponse.json(
        { error: invitationError.message },
        { status: 500 },
      );
    }

    if (!consumedInvitations || consumedInvitations.length !== 1) {
      return NextResponse.json(
        { error: "招待コードの使用に失敗しました。もう一度お試しください。" },
        { status: 409 },
      );
    }

    const { error: invitationUseError } = await supabase
      .from("invitation_uses")
      .insert({
        invitation_id: invitation.id,
        used_by_user_id: target.id,
        used_by_team_id: target.team_id,
      });

    if (invitationUseError) {
      return NextResponse.json(
        { error: invitationUseError.message },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({
    success: true,
    member: { id: target.id, name: target.name },
  });
}
