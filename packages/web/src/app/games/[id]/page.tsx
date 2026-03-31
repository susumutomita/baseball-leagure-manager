import { GameStatusBadge } from "@/components/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import { getAvailableTransitions } from "@match-engine/core";
import type { GameStatus, RsvpResponse } from "@match-engine/core";

const RSVP_LABELS: Record<RsvpResponse, string> = {
  AVAILABLE: "参加",
  UNAVAILABLE: "不参加",
  MAYBE: "未定",
  NO_RESPONSE: "未回答",
};

const RSVP_COLORS: Record<RsvpResponse, string> = {
  AVAILABLE: "bg-green-100 text-green-700",
  UNAVAILABLE: "bg-red-100 text-red-700",
  MAYBE: "bg-yellow-100 text-yellow-700",
  NO_RESPONSE: "bg-gray-100 text-gray-600",
};

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: game } = await supabase
    .from("games")
    .select("*")
    .eq("id", id)
    .single();

  if (!game) {
    return (
      <div className="py-12 text-center text-gray-500">
        試合が見つかりません
      </div>
    );
  }

  const { data: rsvps } = await supabase
    .from("rsvps")
    .select("*, members(name, tier)")
    .eq("game_id", id);

  const transitions = getAvailableTransitions(game.status as GameStatus);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{game.title}</h1>
        <div className="mt-2 flex items-center gap-3">
          <GameStatusBadge status={game.status as GameStatus} />
          <span className="text-sm text-gray-500">{game.game_type}</span>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-4 rounded-lg border bg-white p-4 text-sm">
        <Dt label="試合日" value={game.game_date ?? "未定"} />
        <Dt label="開始" value={game.start_time ?? "未定"} />
        <Dt label="グラウンド" value={game.ground_name ?? "未定"} />
        <Dt label="最低人数" value={`${game.min_players}人`} />
        <Dt
          label="出欠"
          value={`参加${game.available_count} / 不参加${game.unavailable_count} / 未回答${game.no_response_count}`}
        />
      </dl>

      {/* 状態遷移 */}
      <section className="rounded-lg border bg-white p-4">
        <h2 className="mb-3 text-sm font-semibold">遷移可能なアクション</h2>
        {transitions.length === 0 ? (
          <p className="text-sm text-gray-500">
            この状態からの遷移はありません
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {transitions.map((t) => (
              <span
                key={t}
                className="rounded border border-gray-300 px-3 py-1 text-xs"
              >
                → {t}
              </span>
            ))}
          </div>
        )}
      </section>

      {/* 出欠一覧 */}
      {rsvps && rsvps.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold">出欠状況</h2>
          <div className="overflow-hidden rounded-lg border bg-white">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-gray-50 text-xs text-gray-500">
                <tr>
                  <th className="px-4 py-2">名前</th>
                  <th className="px-4 py-2">区分</th>
                  <th className="px-4 py-2">回答</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rsvps.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2 font-medium">
                      {(r.members as { name: string })?.name ?? "—"}
                    </td>
                    <td className="px-4 py-2 text-gray-500">
                      {(r.members as { tier: string })?.tier ?? "—"}
                    </td>
                    <td className="px-4 py-2">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${RSVP_COLORS[r.response as RsvpResponse] ?? ""}`}
                      >
                        {RSVP_LABELS[r.response as RsvpResponse] ?? r.response}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function Dt({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-gray-500">{label}</dt>
      <dd className="mt-0.5 font-medium">{value}</dd>
    </div>
  );
}
