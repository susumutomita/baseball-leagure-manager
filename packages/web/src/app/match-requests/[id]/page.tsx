import { ConfidenceBar } from "@/components/ConfidenceBar";
import { MatchStatusBadge } from "@/components/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import { getAvailableTransitions } from "@match-engine/core";
import type { MatchRequestStatus } from "@match-engine/core";

export default async function MatchRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: mr, error } = await supabase
    .from("match_requests")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !mr) {
    return (
      <div className="py-12 text-center text-gray-500">
        試合リクエストが見つかりません
      </div>
    );
  }

  const transitions = getAvailableTransitions(mr.status as MatchRequestStatus);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{mr.title}</h1>
        <div className="mt-2 flex items-center gap-3">
          <MatchStatusBadge status={mr.status as MatchRequestStatus} />
          <ConfidenceBar score={mr.confidence_score} />
          {mr.review_required && (
            <span className="text-xs text-orange-600">要レビュー</span>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-4 rounded-lg border bg-white p-4 text-sm">
        <Dt label="エリア" value={mr.area} />
        <Dt label="レベル" value={mr.level_requirement ?? "指定なし"} />
        <Dt label="候補日" value={mr.desired_dates_json.join(", ")} />
        <Dt
          label="時間帯"
          value={mr.preferred_time_slots_json.join(", ") || "指定なし"}
        />
        <Dt
          label="グラウンド"
          value={mr.needs_ground ? "要確保" : "確保済み"}
        />
        <Dt
          label="予算上限"
          value={mr.budget_limit ? `${mr.budget_limit}円` : "未設定"}
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
