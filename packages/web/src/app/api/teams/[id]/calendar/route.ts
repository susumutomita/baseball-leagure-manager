import { createClient } from "@/lib/supabase/server";
import { generateICalFeed } from "@match-engine/core";
import type { Game } from "@match-engine/core";

/** GET /api/teams/:id/calendar — iCalendar フィード (.ics) */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  // チーム名を取得
  const { data: team } = await supabase
    .from("teams")
    .select("name")
    .eq("id", id)
    .single();

  const calendarName = team?.name ?? "試合カレンダー";

  // CANCELLED, DRAFT 以外かつ game_date が設定されている試合を取得
  const { data: games } = await supabase
    .from("games")
    .select("*")
    .eq("team_id", id)
    .not("status", "in", "(CANCELLED,DRAFT)")
    .not("game_date", "is", null)
    .order("game_date", { ascending: true });

  const ical = generateICalFeed((games as Game[]) ?? [], calendarName);

  return new Response(ical, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="games.ics"',
    },
  });
}
