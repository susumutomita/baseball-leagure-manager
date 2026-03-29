"use client";

import { useState } from "react";
import type { LevelBand } from "@/types/domain";

export default function NewMatchRequestPage() {
  const [title, setTitle] = useState("");
  const [area, setArea] = useState("");
  const [dates, setDates] = useState("");
  const [timeSlots, setTimeSlots] = useState("");
  const [level, setLevel] = useState<LevelBand>("INTERMEDIATE");
  const [needsGround, setNeedsGround] = useState(true);
  const [budget, setBudget] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    try {
      const res = await fetch("/api/match-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team_id: "00000000-0000-0000-0000-000000000001", // MVP: 固定チームID
          title,
          area,
          desired_dates: dates
            .split(",")
            .map((d) => d.trim())
            .filter(Boolean),
          preferred_time_slots: timeSlots
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          level_requirement: level,
          needs_ground: needsGround,
          budget_limit: budget ? parseInt(budget) : null,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setResult(`作成しました (ID: ${data.id})`);
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
      <h1 className="mb-6 text-2xl font-bold">試合リクエスト作成</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="タイトル">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="例: 5月第2週 練習試合"
            className="input"
          />
        </Field>

        <Field label="エリア">
          <input
            type="text"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            required
            placeholder="例: 東京都・世田谷区"
            className="input"
          />
        </Field>

        <Field label="希望日 (カンマ区切り)">
          <input
            type="text"
            value={dates}
            onChange={(e) => setDates(e.target.value)}
            required
            placeholder="例: 2026-05-09, 2026-05-10"
            className="input"
          />
        </Field>

        <Field label="希望時間帯 (カンマ区切り)">
          <input
            type="text"
            value={timeSlots}
            onChange={(e) => setTimeSlots(e.target.value)}
            placeholder="例: 9:00-12:00, 13:00-17:00"
            className="input"
          />
        </Field>

        <Field label="レベル">
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as LevelBand)}
            className="input"
          >
            <option value="BEGINNER">初心者</option>
            <option value="INTERMEDIATE">中級</option>
            <option value="ADVANCED">上級</option>
            <option value="COMPETITIVE">競技志向</option>
          </select>
        </Field>

        <Field label="グラウンド">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={needsGround}
              onChange={(e) => setNeedsGround(e.target.checked)}
            />
            グラウンドの確保が必要
          </label>
        </Field>

        <Field label="予算上限 (円)">
          <input
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
            placeholder="例: 5000"
            className="input"
          />
        </Field>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "作成中..." : "試合リクエストを作成"}
        </button>

        {result && (
          <p
            className={`rounded-lg p-3 text-sm ${
              result.startsWith("エラー") || result.startsWith("通信")
                ? "bg-red-50 text-red-700"
                : "bg-green-50 text-green-700"
            }`}
          >
            {result}
          </p>
        )}
      </form>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
    </div>
  );
}
