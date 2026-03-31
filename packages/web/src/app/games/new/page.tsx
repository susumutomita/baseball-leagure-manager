"use client";

import type { GameType } from "@match-engine/core";
import { useState } from "react";

export default function NewGamePage() {
  const [title, setTitle] = useState("");
  const [gameType, setGameType] = useState<GameType>("FRIENDLY");
  const [gameDate, setGameDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [groundName, setGroundName] = useState("");
  const [minPlayers, setMinPlayers] = useState("9");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);

    try {
      const res = await fetch("/api/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team_id: process.env.NEXT_PUBLIC_DEFAULT_TEAM_ID,
          title,
          game_type: gameType,
          game_date: gameDate || null,
          start_time: startTime || null,
          ground_name: groundName || null,
          min_players: Number.parseInt(minPlayers) || 9,
          note: note || null,
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
      <h1 className="mb-6 text-2xl font-bold">試合作成</h1>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Field label="タイトル">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            placeholder="例: 4/5 vs ○○さん"
            className="input"
          />
        </Field>

        <Field label="種別">
          <select
            value={gameType}
            onChange={(e) => setGameType(e.target.value as GameType)}
            className="input"
          >
            <option value="PRACTICE">練習</option>
            <option value="FRIENDLY">練習試合</option>
            <option value="LEAGUE">リーグ戦</option>
            <option value="TOURNAMENT">トーナメント</option>
          </select>
        </Field>

        <Field label="試合日">
          <input
            type="date"
            value={gameDate}
            onChange={(e) => setGameDate(e.target.value)}
            className="input"
          />
        </Field>

        <Field label="開始時刻">
          <input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="input"
          />
        </Field>

        <Field label="グラウンド">
          <input
            type="text"
            value={groundName}
            onChange={(e) => setGroundName(e.target.value)}
            placeholder="例: 八部公園野球場"
            className="input"
          />
        </Field>

        <Field label="最低人数">
          <input
            type="number"
            value={minPlayers}
            onChange={(e) => setMinPlayers(e.target.value)}
            min="1"
            className="input"
          />
        </Field>

        <Field label="メモ">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className="input"
            rows={3}
          />
        </Field>

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {submitting ? "作成中..." : "試合を作成"}
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
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </span>
      {children}
    </label>
  );
}
