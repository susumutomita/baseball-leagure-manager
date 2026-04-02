import { createClient } from "@/lib/supabase/server";
import {
  apiError,
  apiSuccess,
  createNegotiationSchema,
  writeAuditLog,
  zodToValidationError,
} from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** POST /api/games/:id/negotiations — 対戦交渉作成 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();

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
    .eq("id", id)
    .single();

  if (gameError) {
    return NextResponse.json(apiError("NOT_FOUND", "試合が見つかりません"), {
      status: 404,
    });
  }

  const { data, error } = await supabase
    .from("negotiations")
    .insert({
      game_id: id,
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

/** GET /api/games/:id/negotiations — 交渉一覧 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("negotiations")
    .select("*, opponent_teams(name, area, contact_name)")
    .eq("game_id", id);

  if (error) {
    return NextResponse.json(apiError("DATABASE_ERROR", error.message), {
      status: 400,
    });
  }

  const negotiations = data ?? [];
  const summary = {
    draft: negotiations.filter((n) => n.status === "DRAFT").length,
    sent: negotiations.filter((n) => n.status === "SENT").length,
    replied: negotiations.filter((n) => n.status === "REPLIED").length,
    accepted: negotiations.filter((n) => n.status === "ACCEPTED").length,
    declined: negotiations.filter((n) => n.status === "DECLINED").length,
    cancelled: negotiations.filter((n) => n.status === "CANCELLED").length,
    total: negotiations.length,
  };

  return NextResponse.json(apiSuccess(negotiations, [], { summary }));
}
