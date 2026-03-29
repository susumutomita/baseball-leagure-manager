import { MatchStatusBadge } from "@/components/StatusBadge";
import { ConfidenceBar } from "@/components/ConfidenceBar";
import type { MatchRequestStatus } from "@/types/domain";
import { getAvailableTransitions } from "@/lib/state-machine";

// MVP: デモデータ。Supabase接続後にAPIから取得に切り替え。
const DEMO: Record<
  string,
  {
    id: string;
    title: string;
    status: MatchRequestStatus;
    area: string;
    desired_dates_json: string[];
    preferred_time_slots_json: string[];
    level_requirement: string;
    needs_ground: boolean;
    budget_limit: number | null;
    confidence_score: number;
    review_required: boolean;
  }
> = {
  "1": {
    id: "1",
    title: "5月第2週 練習試合",
    status: "NEGOTIATING",
    area: "東京都・世田谷区",
    desired_dates_json: ["2026-05-09", "2026-05-10"],
    preferred_time_slots_json: ["9:00-12:00"],
    level_requirement: "INTERMEDIATE",
    needs_ground: true,
    budget_limit: 5000,
    confidence_score: 55,
    review_required: false,
  },
};

export default async function MatchRequestDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const mr = DEMO[id];

  if (!mr) {
    return (
      <div className="py-12 text-center text-gray-500">
        試合リクエストが見つかりません
      </div>
    );
  }

  const transitions = getAvailableTransitions(mr.status);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{mr.title}</h1>
        <div className="mt-2 flex items-center gap-3">
          <MatchStatusBadge status={mr.status} />
          <ConfidenceBar score={mr.confidence_score} />
          {mr.review_required && (
            <span className="text-xs text-orange-600">要レビュー</span>
          )}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-4 rounded-lg border bg-white p-4 text-sm">
        <Dt label="エリア" value={mr.area} />
        <Dt label="レベル" value={mr.level_requirement} />
        <Dt label="候補日" value={mr.desired_dates_json.join(", ")} />
        <Dt label="時間帯" value={mr.preferred_time_slots_json.join(", ")} />
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
