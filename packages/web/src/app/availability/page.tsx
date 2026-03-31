import { createClient } from "@/lib/supabase/server";
import type { AvailabilityResponseType } from "@match-engine/core";

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

export default async function AvailabilityPage() {
  const supabase = await createClient();

  // 最新の進行中リクエストを取得して出欠表示
  const DEFAULT_TEAM_ID = process.env.NEXT_PUBLIC_DEFAULT_TEAM_ID;
  const { data: latestRequest } = await supabase
    .from("match_requests")
    .select("id, title")
    .eq("team_id", DEFAULT_TEAM_ID!)
    .in("status", ["OPEN", "NEGOTIATING", "MATCH_CANDIDATE_FOUND"])
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (!latestRequest) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">出欠管理</h1>
        <p className="text-sm text-gray-500">
          進行中の試合リクエストがありません
        </p>
      </div>
    );
  }

  const { data: responses } = await supabase
    .from("availability_responses")
    .select("*, members(*)")
    .eq("match_request_id", latestRequest.id);

  const members = (responses ?? []).map((r) => ({
    id: r.id as string,
    name: (r.members as { name: string })?.name ?? "不明",
    position:
      ((r.members as { positions_json: string[] })?.positions_json ?? [])[0] ??
      "",
    response: r.response as AvailabilityResponseType,
  }));

  const available = members.filter((m) => m.response === "AVAILABLE").length;
  const unknown = members.filter((m) => m.response === "UNKNOWN").length;
  const minPlayers = 9;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">出欠管理</h1>
      <p className="text-sm text-gray-500">{latestRequest.title}</p>

      {/* サマリー */}
      <div className="flex gap-4">
        <div className="rounded-lg border bg-white p-4">
          <p className="text-xs text-gray-500">参加可能</p>
          <p
            className={`text-2xl font-bold ${available >= minPlayers ? "text-green-600" : "text-orange-600"}`}
          >
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
          最低人数 ({minPlayers}人)
          に達していません。未回答メンバーへのリマインドを検討してください。
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
            {members.map((m) => (
              <tr key={m.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{m.name}</td>
                <td className="px-4 py-3">{m.position}</td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${RESPONSE_COLORS[m.response]}`}
                  >
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
