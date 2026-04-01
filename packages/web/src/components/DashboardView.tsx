"use client";

import type { GameStatus } from "@match-engine/core";
import { useState } from "react";
import { Calendar } from "./Calendar";
import type { CalendarGame } from "./Calendar";
import { GameStatusBadge } from "./StatusBadge";

interface GameRow {
  id: string;
  title: string;
  game_type: string;
  status: string;
  game_date: string | null;
  available_count: number;
  unavailable_count: number;
  no_response_count: number;
}

interface DashboardViewProps {
  games: GameRow[];
  calendarGames: CalendarGame[];
}

export function DashboardView({ games, calendarGames }: DashboardViewProps) {
  const [view, setView] = useState<"table" | "calendar">("calendar");

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">試合一覧</h2>
        <div className="flex rounded-lg border border-gray-200 p-0.5 text-xs">
          <button
            type="button"
            onClick={() => setView("calendar")}
            className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
              view === "calendar"
                ? "bg-gray-900 text-white"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            カレンダー
          </button>
          <button
            type="button"
            onClick={() => setView("table")}
            className={`rounded-md px-3 py-1.5 font-medium transition-colors ${
              view === "table"
                ? "bg-gray-900 text-white"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            一覧
          </button>
        </div>
      </div>

      {view === "calendar" ? (
        <Calendar games={calendarGames} />
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">タイトル</th>
                <th className="px-4 py-3">種別</th>
                <th className="px-4 py-3">ステータス</th>
                <th className="px-4 py-3">試合日</th>
                <th className="px-4 py-3">出欠</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {games.map((g) => (
                <tr key={g.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">
                    <a
                      href={`/games/${g.id}`}
                      className="text-blue-600 hover:underline"
                    >
                      {g.title}
                    </a>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{g.game_type}</td>
                  <td className="px-4 py-3">
                    <GameStatusBadge status={g.status as GameStatus} />
                  </td>
                  <td className="px-4 py-3">{g.game_date ?? "未定"}</td>
                  <td className="px-4 py-3">
                    <span className="text-green-600">{g.available_count}</span>/
                    <span className="text-red-600">{g.unavailable_count}</span>/
                    <span className="text-gray-400">{g.no_response_count}</span>
                  </td>
                </tr>
              ))}
              {games.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-gray-400"
                  >
                    試合がありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
