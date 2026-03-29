import type { AvailabilityResponseType } from "@/types/domain";

// MVP: デモデータ
const DEMO_MEMBERS = [
  { id: "m1", name: "田中太郎", position: "ピッチャー", response: "AVAILABLE" as AvailabilityResponseType },
  { id: "m2", name: "鈴木一郎", position: "キャッチャー", response: "AVAILABLE" as AvailabilityResponseType },
  { id: "m3", name: "佐藤次郎", position: "ショート", response: "MAYBE" as AvailabilityResponseType },
  { id: "m4", name: "山田三郎", position: "外野手", response: "UNAVAILABLE" as AvailabilityResponseType },
  { id: "m5", name: "高橋四郎", position: "一塁手", response: "UNKNOWN" as AvailabilityResponseType },
  { id: "m6", name: "中村五郎", position: "二塁手", response: "AVAILABLE" as AvailabilityResponseType },
  { id: "m7", name: "小林六郎", position: "三塁手", response: "UNKNOWN" as AvailabilityResponseType },
  { id: "m8", name: "加藤七郎", position: "外野手", response: "AVAILABLE" as AvailabilityResponseType },
  { id: "m9", name: "吉田八郎", position: "外野手", response: "UNKNOWN" as AvailabilityResponseType },
];

const RESPONSE_LABELS: Record<AvailabilityResponseType, string> = {
  UNKNOWN: "未回答",
  AVAILABLE: "参加可",
  UNAVAILABLE: "不参加",
  MAYBE: "未定",
};

const RESPONSE_COLORS: Record<AvailabilityResponseType, string> = {
  UNKNOWN: "bg-gray-100 text-gray-600",
  AVAILABLE: "bg-green-100 text-green-700",
  UNAVAILABLE: "bg-red-100 text-red-700",
  MAYBE: "bg-yellow-100 text-yellow-700",
};

export default function AvailabilityPage() {
  const available = DEMO_MEMBERS.filter((m) => m.response === "AVAILABLE").length;
  const unknown = DEMO_MEMBERS.filter((m) => m.response === "UNKNOWN").length;
  const minPlayers = 9;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">出欠管理</h1>
      <p className="text-sm text-gray-500">5月第2週 練習試合</p>

      {/* サマリー */}
      <div className="flex gap-4">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-gray-500">参加可能</p>
          <p className={`text-2xl font-bold ${available >= minPlayers ? "text-green-600" : "text-orange-600"}`}>
            {available} / {minPlayers}
          </p>
        </div>
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-gray-500">未回答</p>
          <p className="text-2xl font-bold text-gray-600">{unknown}</p>
        </div>
      </div>

      {available < minPlayers && (
        <div className="rounded-lg bg-orange-50 p-3 text-sm text-orange-700">
          最低人数 ({minPlayers}人) に達していません。未回答メンバーへのリマインドを検討してください。
        </div>
      )}

      {/* メンバー一覧 */}
      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">名前</th>
              <th className="px-4 py-3">ポジション</th>
              <th className="px-4 py-3">回答</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {DEMO_MEMBERS.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{m.name}</td>
                <td className="px-4 py-3">{m.position}</td>
                <td className="px-4 py-3">
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${RESPONSE_COLORS[m.response]}`}>
                    {RESPONSE_LABELS[m.response]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
