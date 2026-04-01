import { DashboardView } from "@/components/DashboardView";
import { createClient } from "@/lib/supabase/server";

export default async function DashboardPage() {
  const supabase = await createClient();
  const teamId = process.env.NEXT_PUBLIC_DEFAULT_TEAM_ID;

  const { data: games } = await supabase
    .from("games")
    .select("*")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: calendarGames } = await supabase
    .from("games")
    .select("id, title, game_date, status, game_type")
    .eq("team_id", teamId)
    .not("game_date", "is", null)
    .order("game_date", { ascending: true });

  const active =
    games?.filter(
      (g) =>
        !["CONFIRMED", "COMPLETED", "SETTLED", "CANCELLED"].includes(g.status),
    ) ?? [];
  const confirmed = games?.filter((g) => g.status === "CONFIRMED") ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        <p className="mt-1 text-sm text-gray-500">
          試合成立エンジン — 現在の状況
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <SummaryCard label="進行中" value={active.length} />
        <SummaryCard label="確定済み" value={confirmed.length} />
        <SummaryCard label="全試合" value={games?.length ?? 0} />
      </div>

      <DashboardView
        games={(games ?? []).map((g) => ({
          id: g.id,
          title: g.title,
          game_type: g.game_type,
          status: g.status,
          game_date: g.game_date,
          available_count: g.available_count,
          unavailable_count: g.unavailable_count,
          no_response_count: g.no_response_count,
        }))}
        calendarGames={(calendarGames ?? []).map((g) => ({
          id: g.id,
          title: g.title,
          game_date: g.game_date,
          status: g.status,
          game_type: g.game_type,
        }))}
      />
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}
