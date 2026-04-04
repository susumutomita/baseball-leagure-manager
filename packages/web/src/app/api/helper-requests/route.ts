import { requireAuth, requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  createHelperRequestsSchema,
  writeAuditLog,
  zodToValidationError,
} from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** GET /api/helper-requests?game_id=xxx&status=xxx */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const gameId = searchParams.get("game_id");
  const status = searchParams.get("status");
  const limit = Math.min(Number(searchParams.get("limit") ?? 50), 100);
  const cursor = searchParams.get("cursor");

  let query = supabase
    .from("helper_requests")
    .select("*, helpers(name, note, reliability_score)")
    .order("created_at", { ascending: false })
    .limit(limit + 1);

  if (gameId) query = query.eq("game_id", gameId);
  if (status) query = query.eq("status", status);
  if (cursor) query = query.lt("created_at", cursor);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(apiError("DATABASE_ERROR", error.message), {
      status: 400,
    });
  }

  const hasMore = data && data.length > limit;
  const items = hasMore ? data.slice(0, limit) : (data ?? []);
  const nextCursor = hasMore ? items[items.length - 1]?.created_at : null;

  const summary = {
    pending: items.filter((r) => r.status === "PENDING").length,
    accepted: items.filter((r) => r.status === "ACCEPTED").length,
    declined: items.filter((r) => r.status === "DECLINED").length,
    cancelled: items.filter((r) => r.status === "CANCELLED").length,
    total: items.length,
  };

  return NextResponse.json(
    apiSuccess(items, [], { summary, next_cursor: nextCursor }),
  );
}

/** POST /api/helper-requests — 助っ人打診作成 (game_id をボディで指定) */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult instanceof NextResponse) return authResult;
  const roleCheck = requireRole(authResult, "ADMIN");
  if (roleCheck) return roleCheck;

  const supabase = await createClient();
  const body = await request.json();

  const gameId = body.game_id;
  if (!gameId || typeof gameId !== "string") {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "game_id は必須です"),
      { status: 400 },
    );
  }

  const parsed = createHelperRequestsSchema.safeParse(body);
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
    .select("id, team_id, status")
    .eq("id", gameId)
    .single();

  if (gameError) {
    return NextResponse.json(apiError("NOT_FOUND", "試合が見つかりません"), {
      status: 404,
    });
  }

  const rows = input.helper_ids.map((helperId) => ({
    game_id: gameId,
    helper_id: helperId,
    status: "PENDING",
    message: input.message,
    sent_at: new Date().toISOString(),
  }));

  const { data, error } = await supabase
    .from("helper_requests")
    .insert(rows)
    .select();

  if (error) {
    return NextResponse.json(apiError("DATABASE_ERROR", error.message), {
      status: 400,
    });
  }

  await writeAuditLog(supabase, {
    actor_type: "USER",
    actor_id: input.actor_id,
    action: "CREATE_HELPER_REQUESTS",
    target_type: "game",
    target_id: gameId,
    after_json: { helper_ids: input.helper_ids, count: data?.length ?? 0 },
  });

  return NextResponse.json(
    apiSuccess(data ?? [], [
      {
        action: "check_fulfillment",
        reason: "助っ人の回答を待って充足状況を確認してください",
        priority: "medium",
        suggested_params: { game_id: gameId },
      },
    ]),
    { status: 201 },
  );
}
