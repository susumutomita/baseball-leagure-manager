"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type RsvpResponse = "AVAILABLE" | "UNAVAILABLE" | "MAYBE" | "NO_RESPONSE";

const RSVP_LABELS: Record<RsvpResponse, string> = {
  AVAILABLE: "参加",
  UNAVAILABLE: "不参加",
  MAYBE: "未定",
  NO_RESPONSE: "未回答",
};

const RSVP_COLORS: Record<RsvpResponse, string> = {
  AVAILABLE: "bg-green-100 text-green-700",
  UNAVAILABLE: "bg-red-100 text-red-700",
  MAYBE: "bg-yellow-100 text-yellow-700",
  NO_RESPONSE: "bg-gray-100 text-gray-600",
};

const RESPONSE_BUTTONS: {
  value: RsvpResponse;
  label: string;
  selected: string;
  unselected: string;
}[] = [
  {
    value: "AVAILABLE",
    label: "参加",
    selected: "bg-green-600 text-white",
    unselected: "border border-green-300 text-green-700 hover:bg-green-50",
  },
  {
    value: "UNAVAILABLE",
    label: "不参加",
    selected: "bg-red-600 text-white",
    unselected: "border border-red-300 text-red-700 hover:bg-red-50",
  },
  {
    value: "MAYBE",
    label: "未定",
    selected: "bg-yellow-500 text-white",
    unselected: "border border-yellow-300 text-yellow-700 hover:bg-yellow-50",
  },
];

interface RsvpRow {
  id: string;
  response: string;
  members: { name: string; tier: string } | null;
}

interface RsvpTableProps {
  initialRsvps: RsvpRow[];
  gameStatus: string;
}

export function RsvpTable({ initialRsvps, gameStatus }: RsvpTableProps) {
  const router = useRouter();
  const [rsvps, setRsvps] = useState(initialRsvps);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const canRespond = gameStatus === "COLLECTING";

  const handleResponse = async (rsvpId: string, response: RsvpResponse) => {
    setPendingId(rsvpId);
    try {
      const res = await fetch(`/api/rsvps/${rsvpId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response }),
      });
      if (!res.ok) throw new Error("更新に失敗しました");
      setRsvps((prev) =>
        prev.map((r) => (r.id === rsvpId ? { ...r, response } : r)),
      );
      router.refresh();
    } finally {
      setPendingId(null);
    }
  };

  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold">出欠状況</h2>
      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="px-4 py-2">名前</th>
              <th className="px-4 py-2">区分</th>
              <th className="px-4 py-2">回答</th>
              {canRespond && <th className="px-4 py-2">アクション</th>}
            </tr>
          </thead>
          <tbody className="divide-y">
            {rsvps.map((r) => (
              <tr key={r.id}>
                <td className="px-4 py-2 font-medium">
                  {r.members?.name ?? "—"}
                </td>
                <td className="px-4 py-2 text-gray-500">
                  {r.members?.tier ?? "—"}
                </td>
                <td className="px-4 py-2">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${RSVP_COLORS[r.response as RsvpResponse] ?? ""}`}
                  >
                    {RSVP_LABELS[r.response as RsvpResponse] ?? r.response}
                  </span>
                </td>
                {canRespond && (
                  <td className="px-4 py-2">
                    <div className="flex gap-1">
                      {RESPONSE_BUTTONS.map((btn) => (
                        <button
                          key={btn.value}
                          type="button"
                          disabled={pendingId === r.id}
                          onClick={() => handleResponse(r.id, btn.value)}
                          className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-colors disabled:opacity-50 ${
                            r.response === btn.value
                              ? btn.selected
                              : btn.unselected
                          }`}
                        >
                          {btn.label}
                        </button>
                      ))}
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
