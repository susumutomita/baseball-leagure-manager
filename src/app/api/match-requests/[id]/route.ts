import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase/server";
import { writeAuditLog } from "@/lib/audit";

/** GET /api/match-requests/:id — 詳細取得 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from("match_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 404 });
  }

  return NextResponse.json(data);
}

/** PATCH /api/match-requests/:id — 更新 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = createServerClient();
  const body = await request.json();

  // 現在のデータを取得
  const { data: before, error: fetchError } = await supabase
    .from("match_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 404 });
  }

  // status は直接変更不可（専用エンドポイントを使用）
  const { status: _status, id: _id, created_at: _ca, ...updateFields } = body;

  const { data, error } = await supabase
    .from("match_requests")
    .update(updateFields)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  await writeAuditLog(supabase, {
    actor_type: "USER",
    actor_id: before.team_id,
    action: "UPDATE_MATCH_REQUEST",
    target_type: "match_request",
    target_id: id,
    before_json: before,
    after_json: data,
  });

  return NextResponse.json(data);
}
