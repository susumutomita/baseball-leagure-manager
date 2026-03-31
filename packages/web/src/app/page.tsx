import { ConfidenceBar } from "@/components/ConfidenceBar";
import { MatchStatusBadge } from "@/components/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import type { MatchRequestStatus } from "@match-engine/core";

const DEFAULT_TEAM_ID = process.env.NEXT_PUBLIC_DEFAULT_TEAM_ID;

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: requests } = await supabase
    .from("match_requests")
    .select("*")
    .eq("team_id", DEFAULT_TEAM_ID!)
    .order("created_at", { ascending: false });

  const allRequests = (requests ?? []) as {
    id: string;
    title: string;
    status: MatchRequestStatus;
    area: string;
    desired_dates_json: string[];
    confidence_score: number;
    review_required: boolean;
  }[];

  const pending = allRequests.filter(
    (r) => !["CONFIRMED", "CANCELLED", "FAILED"].includes(r.status),
  );
  const confirmed = allRequests.filter((r) => r.status === "CONFIRMED");

  // 未返信メンバー数を集計
  const { count: unknownCount } = await supabase
    .from("availability_responses")
    .select("*", { count: "exact", head: true })
    .eq("response", "UNKNOWN")
    .in(
      "match_request_id",
      pending.map((r) => r.id),
    );

  // 監視中グラウンド数
  const { count: groundCount } = await supabase
    .from("ground_watch_targets")
    .select("*", { count: "exact", head: true })
    .eq("team_id", DEFAULT_TEAM_ID!)
    .eq("active", true);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">ダッシュボード</h1>
        <p className="mt-1 text-sm text-gray-500">
          試合成立エンジン — 現在の状況
        </p>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <SummaryCard label="進行中" value={pending.length} />
        <SummaryCard label="確定済み" value={confirmed.length} />
        <SummaryCard label="未返信メンバー" value={unknownCount ?? 0} warn />
        <SummaryCard label="監視中グラウンド" value={groundCount ?? 0} />
      </div>

      {/* 試合候補一覧 */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">試合候補</h2>
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">タイトル</th>
                <th className="px-4 py-3">ステータス</th>
                <th className="px-4 py-3">エリア</th>
                <th className="px-4 py-3">候補日</th>
                <th className="px-4 py-3">確度</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {allRequests.map((r) => (
                <tr key={r.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    <a
                      href={`/match-requests/${r.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {r.title}
                    </a>
                  </td>
                  <td className="px-4 py-3">
                    <MatchStatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-3">{r.area}</td>
                  <td className="px-4 py-3">
                    {r.desired_dates_json.join(", ")}
                  </td>
                  <td className="px-4 py-3">
                    <ConfidenceBar score={r.confidence_score} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  warn,
}: {
  label: string;
  value: number;
  warn?: boolean;
}) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <p className="text-xs text-gray-500">{label}</p>
      <p
        className={`mt-1 text-2xl font-bold ${warn ? "text-orange-600" : "text-gray-900"}`}
      >
        {value}
      </p>
    </div>
  );
}
