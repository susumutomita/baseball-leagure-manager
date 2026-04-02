import { createClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  createHelperRequestsSchema,
  writeAuditLog,
  zodToValidationError,
} from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** POST /api/games/:id/helper-requests — 助っ人打診作成 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();

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
    .eq("id", id)
    .single();

  if (gameError) {
    return NextResponse.json(apiError("NOT_FOUND", "試合が見つかりません"), {
      status: 404,
    });
  }

  const rows = input.helper_ids.map((helperId) => ({
    game_id: id,
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
    target_id: id,
    after_json: { helper_ids: input.helper_ids, count: data?.length ?? 0 },
  });

  return NextResponse.json(
    apiSuccess(data ?? [], [
      {
        action: "check_fulfillment",
        reason: "助っ人の回答を待って充足状況を確認してください",
        priority: "medium",
        suggested_params: { game_id: id },
      },
    ]),
    { status: 201 },
  );
}

/** GET /api/games/:id/helper-requests — 助っ人打診一覧 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("helper_requests")
    .select("*, helpers(name, note, reliability_score)")
    .eq("game_id", id);

  if (error) {
    return NextResponse.json(apiError("DATABASE_ERROR", error.message), {
      status: 400,
    });
  }

  const requests = data ?? [];
  const summary = {
    pending: requests.filter((r) => r.status === "PENDING").length,
    accepted: requests.filter((r) => r.status === "ACCEPTED").length,
    declined: requests.filter((r) => r.status === "DECLINED").length,
    cancelled: requests.filter((r) => r.status === "CANCELLED").length,
    total: requests.length,
  };

  return NextResponse.json(apiSuccess(requests, [], { summary }));
}
