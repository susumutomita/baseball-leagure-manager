"use client";

import { useState } from "react";

export function AddMemberForm({ teamId }: { teamId: string }) {
  const [name, setName] = useState("");
  const [tier, setTier] = useState<"PRO" | "LITE">("PRO");
  const [email, setEmail] = useState("");
  const [jerseyNumber, setJerseyNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    try {
      const res = await fetch("/api/members", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team_id: teamId,
          name,
          tier,
          email: email || undefined,
          jersey_number: jerseyNumber ? Number(jerseyNumber) : undefined,
        }),
      });

      if (res.ok) {
        setResult({ ok: true, message: `${name} を追加しました` });
        setName("");
        setEmail("");
        setJerseyNumber("");
        // ページをリロードしてメンバー一覧を更新
        window.location.reload();
      } else {
        const err = await res.json();
        setResult({ ok: false, message: err.error });
      }
    } catch {
      setResult({ ok: false, message: "通信エラーが発生しました" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          placeholder="名前"
          className="input"
        />
        <select
          value={tier}
          onChange={(e) => setTier(e.target.value as "PRO" | "LITE")}
          className="input"
        >
          <option value="PRO">PRO（正規）</option>
          <option value="LITE">LITE（準）</option>
        </select>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="メール（任意）"
          className="input"
        />
        <input
          type="number"
          value={jerseyNumber}
          onChange={(e) => setJerseyNumber(e.target.value)}
          placeholder="背番号"
          min="0"
          max="999"
          className="input"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
      >
        {submitting ? "追加中..." : "メンバーを追加"}
      </button>

      {result && (
        <p
          className={`rounded-lg p-2 text-sm ${
            result.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}
        >
          {result.message}
        </p>
      )}
    </form>
  );
}
