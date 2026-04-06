import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** GET /api/leagues/:id — リーグ詳細 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("leagues")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    return NextResponse.json(apiError("NOT_FOUND", "リーグが見つかりません"), {
      status: 404,
    });
  }

  return NextResponse.json(apiSuccess(data));
}
