import { createClient } from "@/lib/supabase/server";

const DEFAULT_TEAM_ID = process.env.NEXT_PUBLIC_DEFAULT_TEAM_ID;

export default async function GroundsPage() {
  const supabase = await createClient();

  const { data: targets } = await supabase
    .from("ground_watch_targets")
    .select(
      "*, ground_availability_snapshots(snapshot_time, availability_json)",
    )
    .eq("team_id", DEFAULT_TEAM_ID!)
    .order("created_at", { ascending: false });

  const grounds = (targets ?? []).map((g) => {
    const snapshots = (
      g.ground_availability_snapshots as {
        snapshot_time: string;
        availability_json: { slots?: unknown[] };
      }[]
    ).sort(
      (a, b) =>
        new Date(b.snapshot_time).getTime() -
        new Date(a.snapshot_time).getTime(),
    );
    const latest = snapshots[0];
    return {
      id: g.id as string,
      name: g.name as string,
      area: g.area as string,
      active: g.active as boolean,
      last_checked: latest?.snapshot_time
        ? new Date(latest.snapshot_time).toLocaleString("ja-JP")
        : "未チェック",
      available_slots: latest?.availability_json?.slots?.length ?? 0,
    };
  });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">グラウンド監視</h1>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">球場名</th>
              <th className="px-4 py-3">エリア</th>
              <th className="px-4 py-3">監視状態</th>
              <th className="px-4 py-3">最終チェック</th>
              <th className="px-4 py-3">空き枠</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {grounds.map((g) => (
              <tr key={g.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{g.name}</td>
                <td className="px-4 py-3">{g.area}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs ${
                      g.active
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {g.active ? "監視中" : "停止"}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500">{g.last_checked}</td>
                <td className="px-4 py-3">
                  {g.available_slots > 0 ? (
                    <span className="font-medium text-green-600">
                      {g.available_slots} 枠
                    </span>
                  ) : (
                    <span className="text-gray-400">なし</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
