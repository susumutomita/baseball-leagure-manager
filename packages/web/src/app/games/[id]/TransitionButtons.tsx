"use client";

import type { GameStatus } from "@match-engine/core";
import { useState } from "react";

const STATUS_LABELS: Record<GameStatus, string> = {
  DRAFT: "下書き",
  COLLECTING: "出欠収集開始",
  ASSESSING: "人数判定",
  ARRANGING: "手配開始",
  CONFIRMED: "確定",
  COMPLETED: "完了",
  SETTLED: "精算済み",
  CANCELLED: "中止",
};

export function TransitionButtons({
  gameId,
  transitions,
}: {
  gameId: string;
  transitions: GameStatus[];
}) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTransition = async (to: GameStatus) => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/games/${gameId}/transition`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to }),
      });

      if (res.ok) {
        window.location.reload();
      } else {
        const err = await res.json();
        setError(err.error);
      }
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {transitions.map((t) => (
          <button
            key={t}
            type="button"
            disabled={loading}
            onClick={() => handleTransition(t)}
            className={`rounded px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
              t === "CANCELLED"
                ? "bg-red-100 text-red-700 hover:bg-red-200"
                : "bg-blue-100 text-blue-700 hover:bg-blue-200"
            }`}
          >
            → {STATUS_LABELS[t] ?? t}
          </button>
        ))}
      </div>
      {error && (
        <p className="rounded bg-red-50 p-2 text-sm text-red-700">{error}</p>
      )}
    </div>
  );
}
