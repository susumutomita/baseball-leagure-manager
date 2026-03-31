import { GameStatusBadge } from "@/components/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import type { GameStatus } from "@match-engine/core";

export default async function DashboardPage() {
  const supabase = await createClient();
  const teamId = process.env.NEXT_PUBLIC_DEFAULT_TEAM_ID;

  const { data: games } = await supabase
    .from("games")
    .select("*")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false })
    .limit(20);

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

      <section>
        <h2 className="mb-3 text-lg font-semibold">試合一覧</h2>
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">タイトル</th>
                <th className="px-4 py-3">種別</th>
                <th className="px-4 py-3">ステータス</th>
                <th className="px-4 py-3">試合日</th>
                <th className="px-4 py-3">出欠</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {games?.map((g) => (
                <tr key={g.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    <a
                      href={`/games/${g.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {g.title}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{g.game_type}</td>
                  <td className="px-4 py-3">
                    <GameStatusBadge status={g.status as GameStatus} />
                  </td>
                  <td className="px-4 py-3">{g.game_date ?? "未定"}</td>
                  <td className="px-4 py-3">
                    <span className="text-green-600">{g.available_count}</span>/
                    <span className="text-red-600">{g.unavailable_count}</span>/
                    <span className="text-gray-400">{g.no_response_count}</span>
                  </td>
                </tr>
              ))}
              {(!games || games.length === 0) && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    試合がありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
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
