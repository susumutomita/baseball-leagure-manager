import { createClient } from "@/lib/supabase/server";
import { type NextRequest, NextResponse } from "next/server";

/** GET /api/grounds/watch-targets/:id/snapshots — スナップショット一覧 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("ground_availability_snapshots")
    .select("*")
    .eq("ground_watch_target_id", id)
    .order("snapshot_time", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(data);
}
