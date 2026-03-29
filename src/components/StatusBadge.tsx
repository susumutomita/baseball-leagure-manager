import type { MatchRequestStatus, NegotiationStatus } from "@/types/domain";

const MATCH_STATUS_COLORS: Record<MatchRequestStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  OPEN: "bg-blue-100 text-blue-700",
  MATCH_CANDIDATE_FOUND: "bg-indigo-100 text-indigo-700",
  NEGOTIATING: "bg-yellow-100 text-yellow-700",
  GROUND_WAITING: "bg-orange-100 text-orange-700",
  READY_TO_CONFIRM: "bg-green-100 text-green-700",
  CONFIRMED: "bg-green-200 text-green-800",
  CANCELLED: "bg-red-100 text-red-700",
  FAILED: "bg-red-200 text-red-800",
};

const MATCH_STATUS_LABELS: Record<MatchRequestStatus, string> = {
  DRAFT: "下書き",
  OPEN: "募集中",
  MATCH_CANDIDATE_FOUND: "候補あり",
  NEGOTIATING: "交渉中",
  GROUND_WAITING: "グラウンド待ち",
  READY_TO_CONFIRM: "確定可能",
  CONFIRMED: "確定",
  CANCELLED: "キャンセル",
  FAILED: "不成立",
};

const NEGOTIATION_STATUS_COLORS: Record<NegotiationStatus, string> = {
  NOT_SENT: "bg-gray-100 text-gray-700",
  SENT: "bg-blue-100 text-blue-700",
  REPLIED: "bg-yellow-100 text-yellow-700",
  ACCEPTED: "bg-green-100 text-green-700",
  DECLINED: "bg-red-100 text-red-700",
  COUNTER_PROPOSED: "bg-purple-100 text-purple-700",
};

const NEGOTIATION_STATUS_LABELS: Record<NegotiationStatus, string> = {
  NOT_SENT: "未送信",
  SENT: "送信済",
  REPLIED: "回答あり",
  ACCEPTED: "承諾",
  DECLINED: "辞退",
  COUNTER_PROPOSED: "再提案",
};

export function MatchStatusBadge({ status }: { status: MatchRequestStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${MATCH_STATUS_COLORS[status] ?? ""}`}
    >
      {MATCH_STATUS_LABELS[status] ?? status}
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
