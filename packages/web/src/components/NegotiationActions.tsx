"use client";

import Button from "@cloudscape-design/components/button";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface NegotiationActionsProps {
  negotiationId: string;
  currentStatus: string;
}

const NEXT_STATUSES: Record<string, { label: string; value: string }[]> = {
  DRAFT: [
    { label: "送信", value: "SENT" },
    { label: "キャンセル", value: "CANCELLED" },
  ],
  SENT: [
    { label: "返信あり", value: "REPLIED" },
    { label: "不成立", value: "DECLINED" },
    { label: "キャンセル", value: "CANCELLED" },
  ],
  REPLIED: [
    { label: "成立", value: "ACCEPTED" },
    { label: "不成立", value: "DECLINED" },
    { label: "キャンセル", value: "CANCELLED" },
  ],
  ACCEPTED: [{ label: "キャンセル", value: "CANCELLED" }],
};

export function NegotiationActions({
  negotiationId,
  currentStatus,
}: NegotiationActionsProps) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  const actions = NEXT_STATUSES[currentStatus];
  if (!actions || actions.length === 0) return null;

  const handleUpdate = async (status: string) => {
    setPending(status);
    try {
      const res = await fetch(`/api/negotiations/${negotiationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        router.refresh();
      }
    } finally {
      setPending(null);
    }
  };

  return (
    <SpaceBetween direction="horizontal" size="xxs">
      {actions.map((action) => (
        <Button
          key={action.value}
          variant={
            action.value === "ACCEPTED" || action.value === "SENT"
              ? "primary"
              : action.value === "CANCELLED"
                ? "link"
                : "normal"
          }
          onClick={() => handleUpdate(action.value)}
          loading={pending === action.value}
          disabled={pending !== null}
        >
          {action.label}
        </Button>
      ))}
    </SpaceBetween>
  );
}
