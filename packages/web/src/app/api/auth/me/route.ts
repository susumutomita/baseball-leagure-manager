import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/line-auth";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

/** GET /api/auth/me — ログイン中のユーザー情報と所属チーム一覧を返す */
export async function GET() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!sessionToken) {
    return NextResponse.json({ data: null }, { status: 401 });
  }

  const profile = await verifySessionToken(sessionToken);
  if (!profile) {
    return NextResponse.json({ data: null }, { status: 401 });
  }

  const supabase = await createClient();

  // ユーザーの全所属チーム+メンバー情報を取得
  const { data: memberships } = await supabase
    .from("members")
    .select("id, team_id, name, role, teams(id, name)")
    .eq("line_user_id", profile.userId)
    .eq("status", "ACTIVE");

  if (!memberships || memberships.length === 0) {
    return NextResponse.json({
      data: {
        lineUserId: profile.userId,
        displayName: profile.displayName,
        pictureUrl: profile.pictureUrl,
        teams: [],
        currentTeam: null,
      },
    });
  }

  const teams = memberships.map((m) => ({
    memberId: m.id,
    teamId: m.team_id,
    teamName: (m.teams as unknown as { id: string; name: string })?.name ?? "",
    role: m.role,
  }));

  return NextResponse.json({
    data: {
      lineUserId: profile.userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
      teams,
      currentTeam: teams[0],
    },
  });
}
