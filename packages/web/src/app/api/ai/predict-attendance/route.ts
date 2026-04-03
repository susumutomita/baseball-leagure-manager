import { requireAuth, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess, predictAttendance } from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** POST /api/ai/predict-attendance — 出欠予測 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const roleCheck = requireRole(authResult, "ADMIN");
  if (roleCheck) return roleCheck;

  const body = await request.json();
  const gameId = body.game_id;

  if (!gameId || typeof gameId !== "string") {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "game_id は必須です"),
      { status: 400 },
    );
  }

  const supabase = await createClient();

  // 試合情報を取得
  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("id, game_date, game_type")
    .eq("id", gameId)
    .single();

  if (gameError || !game) {
    return NextResponse.json(apiError("NOT_FOUND", "試合が見つかりません"), {
      status: 404,
    });
  }

  // NO_RESPONSE のメンバーを取得
  const { data: rsvps, error: rsvpError } = await supabase
    .from("rsvps")
    .select("member_id")
    .eq("game_id", gameId)
    .eq("response", "NO_RESPONSE");

  if (rsvpError) {
    return NextResponse.json(apiError("DATABASE_ERROR", rsvpError.message), {
      status: 400,
    });
  }

  if (!rsvps || rsvps.length === 0) {
    return NextResponse.json(
      apiSuccess(
        [],
        [
          {
            action: "check_rsvps",
            reason: "未回答のメンバーはいません",
            priority: "low",
          },
        ],
      ),
    );
  }

  const memberIds = rsvps.map((r) => r.member_id);
  const { data: members, error: memberError } = await supabase
    .from("members")
    .select("id, name, attendance_rate, no_show_rate")
    .in("id", memberIds);

  if (memberError || !members) {
    return NextResponse.json(
      apiError(
        "DATABASE_ERROR",
        memberError?.message ?? "メンバー取得に失敗しました",
      ),
      { status: 400 },
    );
  }

  // 各メンバーの出欠予測を並列実行
  const predictions = await Promise.all(
    members.map(async (member) => {
      const prediction = await predictAttendance(
        {
          name: member.name,
          attendance_rate: member.attendance_rate,
          no_show_rate: member.no_show_rate,
        },
        {
          game_date: game.game_date,
          game_type: game.game_type,
        },
      );
      return {
        member_id: member.id,
        member_name: member.name,
        ...prediction,
      };
    }),
  );

  // 確率の高い順にソート
  predictions.sort((a, b) => b.probability - a.probability);

  return NextResponse.json(
    apiSuccess(predictions, [
      {
        action: "send_reminders",
        reason: "予測結果をもとにリマインダーを送信できます",
        priority: "medium",
      },
    ]),
  );
}
