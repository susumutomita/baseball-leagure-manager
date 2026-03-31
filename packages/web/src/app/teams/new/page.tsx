"use client";

import { useState } from "react";

export default function NewTeamPage() {
  const [name, setName] = useState("");
  const [homeArea, setHomeArea] = useState("");
  const [levelBand, setLevelBand] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          home_area: homeArea,
          level_band: levelBand || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        window.location.href = `/teams/${data.id}`;
      } else {
        const err = await res.json();
        setResult(`エラー: ${err.error}`);
      }
    } catch {
      setResult("通信エラーが発生しました");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold">チーム作成</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">
            チーム名
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="例: 草野球クラブ"
            className="input"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">
            活動エリア
          </span>
          <input
            type="text"
            value={homeArea}
            onChange={(e) => setHomeArea(e.target.value)}
            required
            placeholder="例: 東京都世田谷区"
            className="input"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-gray-700">
            レベル帯
          </span>
          <input
            type="text"
            value={levelBand}
            onChange={(e) => setLevelBand(e.target.value)}
            placeholder="例: 初級〜中級"
            className="input"
          />
        </label>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "作成中..." : "チームを作成"}
        </button>

        {result && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            {result}
          </p>
        )}
      </form>
    </div>
  );
}
