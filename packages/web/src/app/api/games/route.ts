import { requireAuth, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  createGameSchema,
  suggestAfterCreate,
  writeAuditLog,
  zodToValidationError,
} from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** POST /api/games — 試合作成 (ADMIN以上) */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const roleCheck = requireRole(authResult, "ADMIN");
  if (roleCheck) return roleCheck;

  const supabase = await createClient();
  const body = await request.json();

  const parsed = createGameSchema.safeParse(body);
  if (!parsed.success) {
    const ve = zodToValidationError(parsed.error);
    return NextResponse.json(
      apiError("VALIDATION_ERROR", ve.issues.map((i) => i.message).join("; "), [
        {
          action: "create_game",
          reason: "入力を修正して再試行してください",
          priority: "high",
        },
      ]),
      { status: 400 },
    );
  }

  const input = parsed.data;

  // チームIDの所有権チェック
  if (input.team_id !== authResult.team_id) {
    return NextResponse.json(
      apiError("FORBIDDEN", "自分のチームの試合のみ作成できます"),
      { status: 403 },
    );
  }

  const { data, error } = await supabase
    .from("games")
    .insert({
      team_id: input.team_id,
      title: input.title,
      game_type: input.game_type,
      game_date: input.game_date,
      start_time: input.start_time,
      end_time: input.end_time,
      ground_name: input.ground_name,
      min_players: input.min_players,
      rsvp_deadline: input.rsvp_deadline,
      note: input.note,
      status: "DRAFT",
    })
    .select()
    .single();

  if (error) {
    console.error("DATABASE_ERROR:", error.message);
    return NextResponse.json(
      apiError("DATABASE_ERROR", "データベースエラーが発生しました"),
      {
        status: 400,
      },
    );
  }

  await writeAuditLog(supabase, {
    actor_type: "USER",
    actor_id: input.team_id,
    action: "CREATE_GAME",
    target_type: "game",
    target_id: data.id,
    after_json: data,
  });

  // 全メンバー分のRSVPを自動作成
  const { data: members } = await supabase
    .from("members")
    .select("id")
    .eq("team_id", input.team_id)
    .eq("status", "ACTIVE");

  if (members && members.length > 0) {
    const rows = members.map((m) => ({
      game_id: data.id,
      member_id: m.id,
      response: "NO_RESPONSE",
    }));
    await supabase
      .from("rsvps")
      .upsert(rows, { onConflict: "game_id,member_id" });

    // DRAFT → COLLECTING に自動遷移
    await supabase
      .from("games")
      .update({ status: "COLLECTING", version: data.version + 1 })
      .eq("id", data.id);

    data.status = "COLLECTING";

    await writeAuditLog(supabase, {
      actor_type: "SYSTEM",
      actor_id: "SYSTEM",
      action: "TRANSITION:DRAFT→COLLECTING",
      target_type: "game",
      target_id: data.id,
      after_json: { member_count: members.length },
    });
  }

  return NextResponse.json(apiSuccess(data, suggestAfterCreate(data)), {
    status: 201,
  });
}

/** GET /api/games?team_id=xxx&cursor=xxx&limit=20 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const teamId = searchParams.get("team_id");
  const limit = Math.min(Number(searchParams.get("limit") ?? 20), 100);
  const cursor = searchParams.get("cursor");

  let query = supabase
    .from("games")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (teamId) {
    query = query.eq("team_id", teamId);
  }
  if (cursor) {
    query = query.lt("created_at", cursor);
  }

  const { data, error } = await query;

  if (error) {
    console.error("DATABASE_ERROR:", error.message);
    return NextResponse.json(
      apiError("DATABASE_ERROR", "データベースエラーが発生しました"),
      {
        status: 400,
      },
    );
  }

  const hasMore = data && data.length > limit;
  const items = hasMore ? data.slice(0, limit) : (data ?? []);
  const nextCursor = hasMore ? items[items.length - 1]?.created_at : null;

  return NextResponse.json(apiSuccess(items, [], { next_cursor: nextCursor }));
}
