import { GameStatusBadge } from "@/components/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import { getAvailableTransitions } from "@match-engine/core";
import type { GameStatus } from "@match-engine/core";
import { RsvpForm } from "./RsvpForm";
import { TransitionButtons } from "./TransitionButtons";

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
        <a href="/" className="text-sm text-blue-600 hover:underline">
          ← ダッシュボード
        </a>
        <h1 className="mt-1 text-2xl font-bold">{game.title}</h1>
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
          <TransitionButtons gameId={id} transitions={transitions} />
        )}
      </section>

      {/* 出欠回答 */}
      {rsvps && rsvps.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold">出欠状況</h2>
          <RsvpForm
            rsvps={rsvps.map((r) => ({
              id: r.id,
              member_id: r.member_id,
              response: r.response,
              members: r.members as { name: string; tier: string } | null,
            }))}
          />
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
