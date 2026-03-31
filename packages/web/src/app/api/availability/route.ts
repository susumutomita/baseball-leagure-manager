import { createClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

/** GET /api/availability?match_request_id=xxx — 出欠一覧（メンバー情報付き） */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const matchRequestId = searchParams.get("match_request_id");

  if (!matchRequestId) {
    return NextResponse.json(
      { error: "match_request_id is required" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("availability_responses")
    .select("*, members(*)")
    .eq("match_request_id", matchRequestId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
