import StatusIndicator from "@cloudscape-design/components/status-indicator";
import type { GameStatus, NegotiationStatus } from "@match-engine/core";

const GAME_STATUS_TYPE: Record<
  GameStatus,
  "success" | "info" | "warning" | "error" | "stopped" | "pending"
> = {
  DRAFT: "pending",
  COLLECTING: "info",
  CONFIRMED: "success",
  COMPLETED: "success",
  SETTLED: "stopped",
  CANCELLED: "error",
};

const GAME_STATUS_LABELS: Record<GameStatus, string> = {
  DRAFT: "下書き",
  COLLECTING: "出欠収集中",
  CONFIRMED: "確定",
  COMPLETED: "完了",
  SETTLED: "精算済み",
  CANCELLED: "中止",
};

const NEGOTIATION_STATUS_TYPE: Record<
  NegotiationStatus,
  "success" | "info" | "warning" | "error" | "stopped" | "pending"
> = {
  DRAFT: "pending",
  SENT: "info",
  REPLIED: "warning",
  ACCEPTED: "success",
  DECLINED: "error",
  CANCELLED: "stopped",
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
    <StatusIndicator type={GAME_STATUS_TYPE[status] ?? "info"}>
      {GAME_STATUS_LABELS[status] ?? status}
    </StatusIndicator>
  );
}

export function NegotiationStatusBadge({
  status,
}: {
  status: NegotiationStatus;
}) {
  return (
    <StatusIndicator type={NEGOTIATION_STATUS_TYPE[status] ?? "info"}>
      {NEGOTIATION_STATUS_LABELS[status] ?? status}
    </StatusIndicator>
  );
}
