import { createClient } from "@/lib/supabase/server";
import { apiError, apiSuccess } from "@match-engine/core";
import { type NextRequest, NextResponse } from "next/server";

/** GET /api/grounds/:id/slots — グラウンド空き状況 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  let query = supabase
    .from("ground_slots")
    .select("*")
    .eq("ground_id", id)
    .order("date", { ascending: true })
    .order("time_slot", { ascending: true });

  if (from) query = query.gte("date", from);
  if (to) query = query.lte("date", to);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json(apiError("DATABASE_ERROR", error.message), {
      status: 400,
    });
  }

  const slots = data ?? [];
  const summary = {
    available: slots.filter((s) => s.status === "AVAILABLE").length,
    reserved: slots.filter((s) => s.status === "RESERVED").length,
    unavailable: slots.filter((s) => s.status === "UNAVAILABLE").length,
    total: slots.length,
  };

  return NextResponse.json(apiSuccess(slots, [], { summary }));
}
