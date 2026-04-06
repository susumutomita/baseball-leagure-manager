import { requireAuth, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess, writeAuditLog } from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** GET /api/games/:id/rsvps — 出欠一覧 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("rsvps")
    .select("*, members(name, tier, positions_json)")
    .eq("game_id", id);

  if (error) {
    return NextResponse.json(apiError("DATABASE_ERROR", error.message), {
      status: 400,
    });
  }

  const rsvps = data ?? [];
  const summary = {
    available: rsvps.filter((r) => r.response === "AVAILABLE").length,
    unavailable: rsvps.filter((r) => r.response === "UNAVAILABLE").length,
    maybe: rsvps.filter((r) => r.response === "MAYBE").length,
    no_response: rsvps.filter((r) => r.response === "NO_RESPONSE").length,
    total: rsvps.length,
  };

  const nextActions =
    summary.no_response > 0
      ? [
          {
            action: "get_rsvps" as const,
            reason: `${summary.no_response}人が未回答です`,
            priority: "high" as const,
          },
        ]
      : [];

  return NextResponse.json(apiSuccess(rsvps, nextActions, { summary }));
}

/** POST /api/games/:id/rsvps — 出欠依頼作成（全メンバー分） */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const roleCheck = requireRole(authResult, "ADMIN");
  if (roleCheck) return roleCheck;

  const { id } = await params;
  const supabase = await createClient();

  const { data: game, error: gameError } = await supabase
    .from("games")
    .select("team_id")
    .eq("id", id)
    .single();

  if (gameError) {
    return NextResponse.json(apiError("NOT_FOUND", "試合が見つかりません"), {
      status: 404,
    });
  }

  const { data: members, error: memberError } = await supabase
    .from("members")
    .select("id")
    .eq("team_id", game.team_id)
    .eq("status", "ACTIVE");

  if (memberError) {
    return NextResponse.json(apiError("DATABASE_ERROR", memberError.message), {
      status: 400,
    });
  }

  if (!members || members.length === 0) {
    return NextResponse.json(
      apiError("NO_MEMBERS", "アクティブなメンバーがいません", [
        {
          action: "list_members",
          reason: "チームメンバーを確認してください",
          priority: "high",
        },
      ]),
      { status: 422 },
    );
  }

  const rows = members.map((m) => ({
    game_id: id,
    member_id: m.id,
    response: "NO_RESPONSE",
  }));

  const { data, error } = await supabase
    .from("rsvps")
    .upsert(rows, { onConflict: "game_id,member_id" })
    .select();

  if (error) {
    return NextResponse.json(apiError("DATABASE_ERROR", error.message), {
      status: 400,
    });
  }

  await writeAuditLog(supabase, {
    actor_type: "SYSTEM",
    actor_id: "SYSTEM",
    action: "REQUEST_RSVPS",
    target_type: "game",
    target_id: id,
    after_json: { member_count: members.length },
  });

  return NextResponse.json(
    apiSuccess({ created: data?.length ?? 0, total_members: members.length }, [
      {
        action: "get_rsvps",
        reason: "出欠状況を確認してください",
        priority: "medium",
        suggested_params: { game_id: id },
      },
    ]),
  );
}
