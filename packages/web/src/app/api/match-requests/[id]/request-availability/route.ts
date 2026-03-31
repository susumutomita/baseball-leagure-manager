import { createClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** POST /api/match-requests/:id/request-availability — 出欠依頼を作成 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  // MatchRequest確認
  const { data: mr, error: mrError } = await supabase
    .from("match_requests")
    .select("team_id")
    .eq("id", id)
    .single();

  if (mrError) {
    return NextResponse.json({ error: mrError.message }, { status: 404 });
  }

  // アクティブメンバーを取得
  const { data: members, error: memberError } = await supabase
    .from("members")
    .select("id")
    .eq("team_id", mr.team_id)
    .eq("status", "ACTIVE");

  if (memberError) {
    return NextResponse.json({ error: memberError.message }, { status: 400 });
  }

  if (!members || members.length === 0) {
    return NextResponse.json(
      { error: "アクティブなメンバーがいません" },
      { status: 422 },
    );
  }

  // 既存の出欠レコードがあるメンバーを除外して作成
  const rows = members.map((m) => ({
    match_request_id: id,
    member_id: m.id,
    response: "UNKNOWN",
  }));

  const { data, error } = await supabase
    .from("availability_responses")
    .upsert(rows, { onConflict: "match_request_id,member_id" })
    .select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await writeAuditLog(supabase, {
    actor_type: "SYSTEM",
    actor_id: "SYSTEM",
    action: "REQUEST_AVAILABILITY",
    target_type: "match_request",
    target_id: id,
    after_json: { member_count: members.length },
  });

  return NextResponse.json({
    created: data?.length ?? 0,
    total_members: members.length,
  });
}
