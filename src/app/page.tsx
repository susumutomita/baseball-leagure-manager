import { MatchStatusBadge } from "@/components/StatusBadge";
import { ConfidenceBar } from "@/components/ConfidenceBar";
import type { MatchRequestStatus } from "@/types/domain";

// MVP段階ではデモデータで表示。Supabase接続後にAPIから取得に切り替え。
const DEMO_REQUESTS = [
  {
    id: "1",
    title: "5月第2週 練習試合",
    status: "NEGOTIATING" as MatchRequestStatus,
    area: "東京都・世田谷区",
    desired_dates_json: ["2026-05-09", "2026-05-10"],
    confidence_score: 55,
    review_required: false,
  },
  {
    id: "2",
    title: "5月第3週 対戦希望",
    status: "OPEN" as MatchRequestStatus,
    area: "東京都・杉並区",
    desired_dates_json: ["2026-05-16", "2026-05-17"],
    confidence_score: 10,
    review_required: false,
  },
  {
    id: "3",
    title: "4月 確定済み試合",
    status: "CONFIRMED" as MatchRequestStatus,
    area: "東京都・大田区",
    desired_dates_json: ["2026-04-12"],
    confidence_score: 100,
    review_required: false,
  },
];

export default function DashboardPage() {
  const pending = DEMO_REQUESTS.filter(
    (r) => !["CONFIRMED", "CANCELLED", "FAILED"].includes(r.status),
  );
  const confirmed = DEMO_REQUESTS.filter((r) => r.status === "CONFIRMED");

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
        <SummaryCard label="未返信メンバー" value={3} warn />
        <SummaryCard label="監視中グラウンド" value={2} />
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
              {DEMO_REQUESTS.map((r) => (
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
