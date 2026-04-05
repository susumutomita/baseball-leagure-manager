import { getAuthMember } from "@/lib/auth";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/line-auth";
import { createClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  createTeamSchema,
  writeAuditLog,
  zodToValidationError,
} from "@match-engine/core";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

/** POST /api/teams — チーム作成（新規ユーザーも可） */
export async function POST(request: NextRequest) {
  // まず既存メンバーとしての認証を試みる
  const member = await getAuthMember();

  // メンバーが見つからない場合、セッションからLINEプロフィールを取得
  // （新規ユーザーのオンボーディング用）
  let lineUserId: string | null = null;
  let displayName: string | null = null;

  if (!member) {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (!sessionToken) {
      return NextResponse.json(apiError("UNAUTHORIZED", "ログインが必要です"), {
        status: 401,
      });
    }
    const profile = await verifySessionToken(sessionToken);
    if (!profile) {
      return NextResponse.json(
        apiError("UNAUTHORIZED", "セッションが無効です"),
        { status: 401 },
      );
    }
    lineUserId = profile.userId;
    displayName = profile.displayName;
  }

  const supabase = await createClient();
  const body = await request.json();

  const parsed = createTeamSchema.safeParse(body);
  if (!parsed.success) {
    const ve = zodToValidationError(parsed.error);
    return NextResponse.json(
      apiError("VALIDATION_ERROR", ve.issues.map((i) => i.message).join("; ")),
      { status: 400 },
    );
  }

  const input = parsed.data;

  // チーム作成
  const { data: team, error: teamError } = await supabase
    .from("teams")
    .insert({
      name: input.name,
      home_area: input.home_area,
      activity_day: input.activity_day,
    })
    .select()
    .single();

  if (teamError) {
    return NextResponse.json(apiError("DATABASE_ERROR", teamError.message), {
      status: 400,
    });
  }

  // 新規ユーザーの場合、SUPER_ADMINとしてメンバーレコードを作成
  if (!member && lineUserId) {
    const { error: memberError } = await supabase.from("members").insert({
      team_id: team.id,
      name: displayName ?? "管理者",
      role: "SUPER_ADMIN",
      tier: "PRO",
      line_user_id: lineUserId,
      status: "ACTIVE",
      positions_json: [],
      attendance_rate: 0,
      no_show_rate: 0,
    });

    if (memberError) {
      console.error("メンバー作成失敗:", memberError);
    }
  }

  await writeAuditLog(supabase, {
    actor_type: "USER",
    actor_id: member?.id ?? lineUserId ?? "unknown",
    action: "CREATE_TEAM",
    target_type: "team",
    target_id: team.id,
    after_json: team,
  });

  return NextResponse.json(
    apiSuccess(team, [
      {
        action: "create_game",
        reason: "チームが作成されました。試合を作成してください",
        priority: "medium",
        suggested_params: { team_id: team.id },
      },
    ]),
    { status: 201 },
  );
}

/** GET /api/teams — チーム一覧 */
export async function GET() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("teams")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(apiError("DATABASE_ERROR", error.message), {
      status: 400,
    });
  }

  return NextResponse.json(apiSuccess(data ?? [], []));
}
