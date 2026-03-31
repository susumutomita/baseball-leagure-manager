"use client";

import { useState } from "react";

interface RsvpRow {
  id: string;
  member_id: string;
  response: string;
  members: { name: string; tier: string } | null;
}

const RESPONSE_OPTIONS = [
  { value: "AVAILABLE", label: "参加", color: "bg-green-600" },
  { value: "UNAVAILABLE", label: "不参加", color: "bg-red-600" },
  { value: "MAYBE", label: "未定", color: "bg-yellow-500" },
] as const;

export function RsvpForm({ rsvps }: { rsvps: RsvpRow[] }) {
  const [updating, setUpdating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUpdate = async (rsvpId: string, response: string) => {
    setUpdating(rsvpId);
    setError(null);

    try {
      const res = await fetch(`/api/rsvps/${rsvpId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response }),
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
      setUpdating(null);
    }
  };

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-lg bg-red-50 p-2 text-sm text-red-700">{error}</p>
      )}
      <div className="overflow-hidden rounded-lg border bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-gray-50 text-xs text-gray-500">
            <tr>
              <th className="px-4 py-2">名前</th>
              <th className="px-4 py-2">区分</th>
              <th className="px-4 py-2">回答</th>
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
                  <div className="flex gap-1">
                    {RESPONSE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        disabled={updating === r.id}
                        onClick={() => handleUpdate(r.id, opt.value)}
                        className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                          r.response === opt.value
                            ? `${opt.color} text-white`
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        } disabled:opacity-50`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
