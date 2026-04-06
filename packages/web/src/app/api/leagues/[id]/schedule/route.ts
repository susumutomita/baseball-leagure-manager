import { requireAuth, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  generateDoubleRoundRobinSchedule,
  generateRoundRobinSchedule,
} from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** POST /api/leagues/:id/schedule — 日程生成 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const roleCheck = requireRole(authResult, "ADMIN");
  if (roleCheck) return roleCheck;

  const { id: leagueId } = await params;
  const supabase = await createClient();

  // リーグ情報取得
  const { data: league, error: leagueError } = await supabase
    .from("leagues")
    .select("*")
    .eq("id", leagueId)
    .single();

  if (leagueError || !league) {
    return NextResponse.json(apiError("NOT_FOUND", "リーグが見つかりません"), {
      status: 404,
    });
  }

  // 参加承認済みチーム取得
  const { data: teams } = await supabase
    .from("league_teams")
    .select("team_id")
    .eq("league_id", leagueId)
    .eq("status", "ACCEPTED");

  const teamIds = (teams ?? []).map((t) => t.team_id);

  if (teamIds.length < 2) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "スケジュール生成には2チーム以上必要です"),
      { status: 400 },
    );
  }

  const schedule =
    league.format === "DOUBLE_ROUND_ROBIN"
      ? generateDoubleRoundRobinSchedule(teamIds)
      : generateRoundRobinSchedule(teamIds);

  // 既存スケジュールを削除して再生成
  await supabase.from("league_matches").delete().eq("league_id", leagueId);

  const rows = schedule.map((m) => ({
    league_id: leagueId,
    home_team_id: m.home_team_id,
    away_team_id: m.away_team_id,
    round: m.round,
    match_number: m.match_number,
    status: "SCHEDULED",
  }));

  const { data: matches, error: insertError } = await supabase
    .from("league_matches")
    .insert(rows)
    .select();

  if (insertError) {
    return NextResponse.json(apiError("DATABASE_ERROR", insertError.message), {
      status: 400,
    });
  }

  return NextResponse.json(apiSuccess(matches), { status: 201 });
}

/** GET /api/leagues/:id/schedule — 日程取得 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id: leagueId } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("league_matches")
    .select("*")
    .eq("league_id", leagueId)
    .order("round", { ascending: true })
    .order("match_number", { ascending: true });

  if (error) {
    return NextResponse.json(apiError("DATABASE_ERROR", error.message), {
      status: 400,
    });
  }

  return NextResponse.json(apiSuccess(data ?? []));
}
