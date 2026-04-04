"use client";

import Button from "@cloudscape-design/components/button";
import Flashbar from "@cloudscape-design/components/flashbar";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { useRouter } from "next/navigation";
import { useState } from "react";

const ACTION_CONFIG: Record<
  string,
  {
    label: string;
    variant: "primary" | "normal" | "link";
    targetStatus: string;
  }[]
> = {
  DRAFT: [
    { label: "送信", variant: "primary", targetStatus: "SENT" },
    { label: "キャンセル", variant: "normal", targetStatus: "CANCELLED" },
  ],
  SENT: [
    { label: "返信あり", variant: "normal", targetStatus: "REPLIED" },
    { label: "辞退", variant: "normal", targetStatus: "DECLINED" },
    { label: "キャンセル", variant: "normal", targetStatus: "CANCELLED" },
  ],
  REPLIED: [
    { label: "承諾", variant: "primary", targetStatus: "ACCEPTED" },
    { label: "辞退", variant: "normal", targetStatus: "DECLINED" },
    { label: "キャンセル", variant: "normal", targetStatus: "CANCELLED" },
  ],
  ACCEPTED: [
    { label: "キャンセル", variant: "normal", targetStatus: "CANCELLED" },
  ],
};

interface NegotiationActionsProps {
  negotiationId: string;
  gameId: string;
  currentStatus: string;
}

export function NegotiationActions({
  negotiationId,
  gameId,
  currentStatus,
}: NegotiationActionsProps) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const actions = ACTION_CONFIG[currentStatus] ?? [];

  const handleAction = async (targetStatus: string) => {
    setPending(targetStatus);
    setError(null);

    try {
      const res = await fetch(
        `/api/games/${gameId}/negotiations/${negotiationId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: targetStatus }),
        },
      );

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "操作に失敗しました");
        return;
      }

      router.refresh();
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setPending(null);
    }
  };

  if (actions.length === 0) {
    return null;
  }

  return (
    <SpaceBetween size="xs">
      {error && (
        <Flashbar
          items={[
            {
              type: "error",
              content: error,
              dismissible: true,
              onDismiss: () => setError(null),
              id: "negotiation-action-error",
            },
          ]}
        />
      )}
      <SpaceBetween direction="horizontal" size="xs">
        {actions.map((action) => (
          <Button
            key={action.targetStatus}
            variant={action.variant}
            loading={pending === action.targetStatus}
            disabled={pending !== null && pending !== action.targetStatus}
            onClick={() => handleAction(action.targetStatus)}
          >
            {action.label}
          </Button>
        ))}
      </SpaceBetween>
    </SpaceBetween>
  );
}
