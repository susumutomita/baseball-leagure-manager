"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const TRANSITION_LABELS: Record<string, string> = {
  COLLECTING: "出欠収集開始",
  ASSESSING: "人数判定へ",
  ARRANGING: "手配開始",
  CONFIRMED: "試合確定",
  COMPLETED: "試合完了",
  SETTLED: "精算済みへ",
  CANCELLED: "中止",
};

const TRANSITION_STYLES: Record<string, string> = {
  CONFIRMED: "bg-green-600 text-white hover:bg-green-700",
  CANCELLED: "bg-red-100 text-red-700 hover:bg-red-200",
  COMPLETED: "bg-emerald-600 text-white hover:bg-emerald-700",
};

const DEFAULT_STYLE = "bg-blue-600 text-white hover:bg-blue-700";

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
      <p className="text-sm text-gray-500">この状態からの遷移はありません</p>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {transitions.map((t) => (
          <button
            key={t}
            type="button"
            disabled={pending !== null}
            onClick={() => handleTransition(t)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${
              TRANSITION_STYLES[t] ?? DEFAULT_STYLE
            }`}
          >
            {pending === t ? "処理中..." : (TRANSITION_LABELS[t] ?? `→ ${t}`)}
          </button>
        ))}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
