import { createClient } from "@/lib/supabase/server";
import { assertTransition, writeAuditLog } from "@match-engine/core";
import type { GameStatus } from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** POST /api/games/:id/transition — 状態遷移 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const body = await request.json();
  const newStatus = body.status as GameStatus;

  const { data: game, error: fetchError } = await supabase
    .from("games")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 404 });
  }

  try {
    assertTransition(game.status as GameStatus, newStatus);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 422 });
  }

  // 楽観的ロック
  const expectedVersion = body.version ?? game.version;
  const { data, error } = await supabase
    .from("games")
    .update({ status: newStatus, version: game.version + 1 })
    .eq("id", id)
    .eq("version", expectedVersion)
    .select()
    .single();

  if (error || !data) {
    return NextResponse.json(
      { error: "他のユーザーが更新しました。リロードしてください" },
      { status: 409 },
    );
  }

  await writeAuditLog(supabase, {
    actor_type: "USER",
    actor_id: body.actor_id ?? "SYSTEM",
    action: `TRANSITION:${game.status}→${newStatus}`,
    target_type: "game",
    target_id: id,
    before_json: { status: game.status, version: game.version },
    after_json: { status: newStatus, version: data.version },
  });

  return NextResponse.json(data);
}
