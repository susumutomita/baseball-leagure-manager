"use client";

import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Flashbar from "@cloudscape-design/components/flashbar";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { useRouter } from "next/navigation";
import { useState } from "react";

const TRANSITION_LABELS: Record<string, string> = {
  COLLECTING: "出欠収集開始",
  CONFIRMED: "試合確定",
  COMPLETED: "試合完了",
  SETTLED: "精算済みへ",
  CANCELLED: "中止",
};

const TRANSITION_VARIANT: Record<string, "primary" | "normal" | "link"> = {
  CONFIRMED: "primary",
  COMPLETED: "primary",
};

interface TransitionButtonsProps {
  gameId: string;
  currentStatus: string;
  transitions: string[];
}

export function TransitionButtons({
  gameId,
  currentStatus: _currentStatus,
  transitions,
}: TransitionButtonsProps) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTransition = async (to: string) => {
    setPending(to);
    setError(null);

    try {
      const res = await fetch(`/api/games/${gameId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "遷移に失敗しました");
        return;
      }

      router.refresh();
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setPending(null);
    }
  };

  if (transitions.length === 0) {
    return (
      <Box color="text-status-inactive">この状態からの遷移はありません</Box>
    );
  }

  return (
    <SpaceBetween size="s">
      {error && (
        <Flashbar
          items={[
            {
              type: "error",
              content: error,
              dismissible: true,
              onDismiss: () => setError(null),
              id: "transition-error",
            },
          ]}
        />
      )}
      <SpaceBetween direction="horizontal" size="xs">
        {transitions.map((t) => (
          <Button
            key={t}
            variant={
              t === "CANCELLED" ? "normal" : (TRANSITION_VARIANT[t] ?? "normal")
            }
            loading={pending === t}
            disabled={pending !== null && pending !== t}
            onClick={() => handleTransition(t)}
          >
            {TRANSITION_LABELS[t] ?? `→ ${t}`}
          </Button>
        ))}
      </SpaceBetween>
    </SpaceBetween>
  );
}
