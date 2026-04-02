"use client";

import { useState } from "react";

type RsvpResponse = "AVAILABLE" | "UNAVAILABLE" | "MAYBE";

const BUTTONS: {
  value: RsvpResponse;
  label: string;
  emoji: string;
  selected: string;
  unselected: string;
}[] = [
  {
    value: "AVAILABLE",
    label: "参加",
    emoji: "⚾",
    selected: "bg-green-600 text-white shadow-lg scale-105",
    unselected: "border-2 border-green-300 text-green-700 active:bg-green-50",
  },
  {
    value: "UNAVAILABLE",
    label: "不参加",
    emoji: "✕",
    selected: "bg-red-600 text-white shadow-lg scale-105",
    unselected: "border-2 border-red-300 text-red-700 active:bg-red-50",
  },
  {
    value: "MAYBE",
    label: "未定",
    emoji: "△",
    selected: "bg-yellow-500 text-white shadow-lg scale-105",
    unselected:
      "border-2 border-yellow-300 text-yellow-700 active:bg-yellow-50",
  },
];

interface RsvpCardProps {
  rsvpId: string;
  currentResponse: string;
  accessToken: string;
  gameStatus: string;
  onUpdated: (newResponse: string) => void;
}

export function RsvpCard({
  rsvpId,
  currentResponse,
  accessToken,
  gameStatus,
  onUpdated,
}: RsvpCardProps) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const canRespond = ["COLLECTING", "ASSESSING"].includes(gameStatus);

  const handleResponse = async (response: RsvpResponse) => {
    if (!canRespond || response === currentResponse) return;
    setPending(true);
    setError(null);

    try {
      const res = await fetch(`/api/rsvps/${rsvpId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ response, channel: "LINE" }),
      });
      if (!res.ok) throw new Error("更新に失敗しました");
      onUpdated(response);
    } catch {
      setError("通信エラーが発生しました");
    } finally {
      setPending(false);
    }
  };

  if (!canRespond) {
    return (
      <div className="rounded-2xl bg-gray-50 p-4 text-center">
        <p className="text-sm text-gray-500">現在、出欠回答の受付期間外です</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-center text-sm font-medium text-gray-700">
        出欠を回答してください
      </p>
      <div className="grid grid-cols-3 gap-3">
        {BUTTONS.map((btn) => (
          <button
            key={btn.value}
            type="button"
            disabled={pending}
            onClick={() => handleResponse(btn.value)}
            className={`flex flex-col items-center gap-1 rounded-2xl px-3 py-4 text-sm font-bold transition-all disabled:opacity-50 ${
              currentResponse === btn.value ? btn.selected : btn.unselected
            }`}
          >
            <span className="text-2xl">{btn.emoji}</span>
            <span>{btn.label}</span>
          </button>
        ))}
      </div>
      {error && <p className="text-center text-xs text-red-500">{error}</p>}
    </div>
  );
}
