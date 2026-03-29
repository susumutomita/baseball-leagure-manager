// MVP: デモデータ
const DEMO_GROUNDS = [
  {
    id: "g1",
    name: "世田谷区立総合運動場",
    area: "東京都・世田谷区",
    active: true,
    last_checked: "2026-03-29 10:00",
    available_slots: 2,
  },
  {
    id: "g2",
    name: "砧公園野球場",
    area: "東京都・世田谷区",
    active: true,
    last_checked: "2026-03-29 10:00",
    available_slots: 0,
  },
];

export default function GroundsPage() {
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
            {DEMO_GROUNDS.map((g) => (
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
