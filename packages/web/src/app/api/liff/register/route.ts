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

  const body = (await request.json()) as { member_id?: string };
  if (!body.member_id) {
    return NextResponse.json(
      { error: "member_id is required" },
      { status: 400 },
    );
  }

  const supabase = await createClient();

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
    .select("id, name, line_user_id")
    .eq("id", body.member_id)
    .single();

  if (!target) {
    return NextResponse.json({ error: "Member not found" }, { status: 404 });
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

  return NextResponse.json({
    success: true,
    member: { id: target.id, name: target.name },
  });
}
