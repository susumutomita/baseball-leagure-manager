import { NegotiationStatusBadge } from "@/components/StatusBadge";
import { createClient } from "@/lib/supabase/server";
import type { NegotiationStatus } from "@match-engine/core";

export default async function NegotiationsPage() {
  const supabase = await createClient();

  const { data: negotiations } = await supabase
    .from("negotiations")
    .select("*, opponent_teams(*)")
    .order("created_at", { ascending: false });

  const items = (negotiations ?? []) as {
    id: string;
    proposed_dates_json: string[];
    status: NegotiationStatus;
    generated_message: string | null;
    reply_message: string | null;
    opponent_teams: { name: string } | null;
    match_request_id: string;
  }[];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">交渉管理</h1>

      <div className="space-y-4">
        {items.map((n) => (
          <div
            key={n.id}
            className="rounded-lg border border-gray-200 bg-white p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">
                  {n.opponent_teams?.name ?? "不明"}
                </p>
              </div>
              <NegotiationStatusBadge status={n.status} />
            </div>

            <div className="mt-3 space-y-2 text-sm">
              {n.generated_message && (
                <div className="rounded bg-blue-50 p-2">
                  <p className="text-xs text-blue-600">送信メッセージ</p>
                  <p>{n.generated_message}</p>
                </div>
              )}
              {n.reply_message && (
                <div className="rounded bg-gray-50 p-2">
                  <p className="text-xs text-gray-500">返信</p>
                  <p>{n.reply_message}</p>
                </div>
              )}
            </div>

            <p className="mt-2 text-xs text-gray-400">
              候補日: {n.proposed_dates_json.join(", ")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
