import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess, writeAuditLog } from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/**
 * POST /api/grounds/webhook — 外部グラウンド監視ツールからの空き情報インポート
 *
 * Body: {
 *   secret: string,
 *   ground_id: string,
 *   slots: Array<{ date: string, time_slot: "MORNING"|"AFTERNOON"|"EVENING", status: "AVAILABLE"|"UNAVAILABLE" }>
 * }
 */
export async function POST(request: NextRequest) {
  const body = await request.json();

  // Webhook シークレット検証
  if (body.secret !== process.env.GROUND_WEBHOOK_SECRET) {
    return NextResponse.json(apiError("UNAUTHORIZED", "無効なシークレット"), {
      status: 401,
    });
  }

  const supabase = await createClient();
  const { ground_id, slots } = body;

  if (!ground_id || !slots || !Array.isArray(slots)) {
    return NextResponse.json(
      apiError("VALIDATION_ERROR", "ground_id と slots が必要です"),
      { status: 400 },
    );
  }

  // グラウンド存在確認
  const { data: ground, error: groundError } = await supabase
    .from("grounds")
    .select("id, team_id, name")
    .eq("id", ground_id)
    .single();

  if (groundError) {
    return NextResponse.json(
      apiError("NOT_FOUND", "グラウンドが見つかりません"),
      { status: 404 },
    );
  }

  // スロットを upsert
  const rows = slots.map(
    (s: { date: string; time_slot: string; status: string }) => ({
      ground_id,
      date: s.date,
      time_slot: s.time_slot,
      status: s.status,
      detected_at: new Date().toISOString(),
    }),
  );

  const { data, error } = await supabase
    .from("ground_slots")
    .upsert(rows, { onConflict: "ground_id,date,time_slot" })
    .select();

  if (error) {
    return NextResponse.json(apiError("DATABASE_ERROR", error.message), {
      status: 400,
    });
  }

  const newlyAvailable =
    data?.filter((s) => s.status === "AVAILABLE").length ?? 0;

  await writeAuditLog(supabase, {
    actor_type: "SYSTEM",
    actor_id: "GROUND_MONITOR",
    action: "IMPORT_GROUND_SLOTS",
    target_type: "ground",
    target_id: ground_id,
    after_json: {
      imported: data?.length ?? 0,
      newly_available: newlyAvailable,
    },
  });

  return NextResponse.json(
    apiSuccess(
      {
        imported: data?.length ?? 0,
        newly_available: newlyAvailable,
        ground_name: ground.name,
      },
      newlyAvailable > 0
        ? [
            {
              action: "create_game",
              reason: `${ground.name}に${newlyAvailable}件の空きが見つかりました`,
              priority: "high" as const,
            },
          ]
        : [],
    ),
  );
}
