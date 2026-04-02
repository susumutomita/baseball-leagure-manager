import type { GameStatus, NegotiationStatus } from "@match-engine/core";

const GAME_STATUS_COLORS: Record<GameStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  COLLECTING: "bg-blue-100 text-blue-700",
  CONFIRMED: "bg-green-200 text-green-800",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  SETTLED: "bg-teal-100 text-teal-700",
  CANCELLED: "bg-red-100 text-red-700",
};

const GAME_STATUS_LABELS: Record<GameStatus, string> = {
  DRAFT: "下書き",
  COLLECTING: "出欠収集中",
  CONFIRMED: "確定",
  COMPLETED: "完了",
  SETTLED: "精算済み",
  CANCELLED: "中止",
};

const NEGOTIATION_STATUS_COLORS: Record<NegotiationStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SENT: "bg-blue-100 text-blue-700",
  REPLIED: "bg-yellow-100 text-yellow-700",
  ACCEPTED: "bg-green-100 text-green-700",
  DECLINED: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-200 text-gray-600",
};

const NEGOTIATION_STATUS_LABELS: Record<NegotiationStatus, string> = {
  DRAFT: "下書き",
  SENT: "送信済",
  REPLIED: "回答あり",
  ACCEPTED: "承諾",
  DECLINED: "辞退",
  CANCELLED: "キャンセル",
};

export function GameStatusBadge({ status }: { status: GameStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${GAME_STATUS_COLORS[status] ?? ""}`}
    >
      {GAME_STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function NegotiationStatusBadge({
  status,
}: {
  status: NegotiationStatus;
}) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${NEGOTIATION_STATUS_COLORS[status] ?? ""}`}
    >
      {NEGOTIATION_STATUS_LABELS[status] ?? status}
    </span>
  );
}
