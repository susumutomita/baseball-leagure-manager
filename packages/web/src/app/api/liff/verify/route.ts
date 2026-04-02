import {
  extractToken,
  isVerifyError,
  verifyLiffToken,
} from "@/lib/liff/verify";
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/** POST /api/liff/verify — LIFFトークン検証 + メンバー情報返却 */
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

  const supabase = await createClient();
  const { data: member } = await supabase
    .from("members")
    .select("id, team_id, name, tier, status")
    .eq("line_user_id", result.lineUserId)
    .eq("status", "ACTIVE")
    .single();

  if (!member) {
    return NextResponse.json(
      { linked: false, lineUserId: result.lineUserId },
      { status: 200 },
    );
  }

  return NextResponse.json({
    linked: true,
    lineUserId: result.lineUserId,
    member,
  });
}
