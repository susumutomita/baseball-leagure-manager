import { requireAuth, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  createNegotiationSchema,
  writeAuditLog,
  zodToValidationError,
} from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** GET /api/negotiations?game_id=xxx&team_id=xxx&status=xxx */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get("game_id");
  const teamId = searchParams.get("team_id");
  const status = searchParams.get("status");
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);
  const cursor = searchParams.get("cursor");

  let query = supabase
    .from("negotiations")
    .select("*, opponent_teams(name, area, contact_name)")
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (gameId) query = query.eq("game_id", gameId);
  if (status) query = query.eq("status", status);
  if (cursor) query = query.lt("created_at", cursor);

  // team_id フィルタは games テーブル経由で行う
  if (teamId) {
    const { data: gameIds } = await supabase
      .from("games")
      .select("id")
      .eq("team_id", teamId);

    if (gameIds && gameIds.length > 0) {
      query = supabase
        .from("negotiations")
        .select("*, opponent_teams(name, area, contact_name)")
        .in(
          "game_id",
          gameIds.map((g) => g.id),
        )
        .order("created_at", { ascending: false })
        .limit(limit + 1);

      if (status) query = query.eq("status", status);
      if (cursor) query = query.lt("created_at", cursor);
    } else {
      return NextResponse.json(apiSuccess([], [], { next_cursor: null }));
    }
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(apiError("DATABASE_ERROR", error.message), {
      status: 400,
    });
  }

  const hasMore = data && data.length > limit;
  const items = hasMore ? data.slice(0, limit) : (data ?? []);
  const nextCursor = hasMore ? items[items.length - 1]?.created_at : null;

  return NextResponse.json(apiSuccess(items, [], { next_cursor: nextCursor }));
}

/** POST /api/negotiations — 交渉作成 (game_id をボディで指定) */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const roleCheck = requireRole(authResult, "ADMIN");
  if (roleCheck) return roleCheck;

  const supabase = await createClient();
  const body = await request.json();

  // game_id はボディから取得
  const gameId = body.game_id;
  if (!gameId || typeof gameId !== "string") {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "game_id は必須です"),
      { status: 400 },
    );
  }

  const parsed = createNegotiationSchema.safeParse(body);
  if (!parsed.success) {
    const ve = zodToValidationError(parsed.error);
    return NextResponse.json(
      apiError("VALIDATION_ERROR", ve.issues.map((i) => i.message).join("; ")),
      { status: 400 },
    );
  }

  const input = parsed.data;

  // 試合の存在確認
  const { error: gameError } = await supabase
    .from("games")
    .select("id")
    .eq("id", gameId)
    .single();

  if (gameError) {
    return NextResponse.json(apiError("NOT_FOUND", "試合が見つかりません"), {
      status: 404,
    });
  }

  const { data, error } = await supabase
    .from("negotiations")
    .insert({
      game_id: gameId,
      opponent_team_id: input.opponent_team_id,
      status: "DRAFT",
      proposed_dates_json: JSON.stringify(input.proposed_dates),
      message_sent: input.message,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(apiError("DATABASE_ERROR", error.message), {
      status: 400,
    });
  }

  await writeAuditLog(supabase, {
    actor_type: input.actor_type,
    actor_id: input.actor_id,
    action: "CREATE_NEGOTIATION",
    target_type: "negotiation",
    target_id: data.id,
    after_json: data,
  });

  return NextResponse.json(
    apiSuccess(data, [
      {
        action: "update_negotiation",
        reason: "交渉を送信してください (DRAFT → SENT)",
        priority: "high",
        suggested_params: { negotiation_id: data.id, status: "SENT" },
      },
    ]),
    { status: 201 },
  );
}
