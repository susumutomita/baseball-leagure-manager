import { NegotiationStatusBadge } from "@/components/StatusBadge";
import type { NegotiationStatus } from "@/types/domain";

// MVP: デモデータ
const DEMO_NEGOTIATIONS = [
  {
    id: "n1",
    opponent: "レッドソックス",
    match_title: "5月第2週 練習試合",
    proposed_dates: ["2026-05-09", "2026-05-10"],
    status: "SENT" as NegotiationStatus,
    generated_message:
      "お世話になります。5月9日または10日に練習試合をお願いできますでしょうか。",
    reply_message: null,
  },
  {
    id: "n2",
    opponent: "ブルージェイズ",
    match_title: "5月第2週 練習試合",
    proposed_dates: ["2026-05-10"],
    status: "ACCEPTED" as NegotiationStatus,
    generated_message: "5月10日に練習試合のお誘いです。",
    reply_message: "承知しました！10日午前でお願いします。",
  },
  {
    id: "n3",
    opponent: "イーグルス",
    match_title: "5月第2週 練習試合",
    proposed_dates: ["2026-05-09"],
    status: "DECLINED" as NegotiationStatus,
    generated_message: "5月9日に練習試合いかがでしょうか。",
    reply_message: "申し訳ありません、その日は予定があります。",
  },
];

export default function NegotiationsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">交渉管理</h1>

      <div className="space-y-4">
        {DEMO_NEGOTIATIONS.map((n) => (
          <div
            key={n.id}
            className="rounded-lg border border-gray-200 bg-white p-4"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{n.opponent}</p>
                <p className="text-xs text-gray-500">{n.match_title}</p>
              </div>
              <NegotiationStatusBadge status={n.status} />
            </div>

            <div className="mt-3 space-y-2 text-sm">
              <div className="rounded bg-blue-50 p-2">
                <p className="text-xs text-blue-600">送信メッセージ</p>
                <p>{n.generated_message}</p>
              </div>
              {n.reply_message && (
                <div className="rounded bg-gray-50 p-2">
                  <p className="text-xs text-gray-500">返信</p>
                  <p>{n.reply_message}</p>
                </div>
              )}
            </div>

            <p className="mt-2 text-xs text-gray-400">
              候補日: {n.proposed_dates.join(", ")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
