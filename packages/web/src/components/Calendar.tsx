"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

const DOW_LABELS = ["日", "月", "火", "水", "木", "金", "土"];

const STATUS_DOT_COLORS: Record<string, string> = {
  DRAFT: "bg-gray-400",
  COLLECTING: "bg-blue-500",
  CONFIRMED: "bg-green-500",
  COMPLETED: "bg-emerald-500",
  SETTLED: "bg-teal-500",
  CANCELLED: "bg-red-400",
};

export interface CalendarGame {
  id: string;
  title: string;
  game_date: string;
  status: string;
  game_type: string;
}

interface CalendarProps {
  games: CalendarGame[];
}

export function Calendar({ games }: CalendarProps) {
  const router = useRouter();
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [openDate, setOpenDate] = useState<string | null>(null);

  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const gamesByDate = useMemo(() => {
    const map = new Map<string, CalendarGame[]>();
    for (const g of games) {
      const list = map.get(g.game_date) ?? [];
      list.push(g);
      map.set(g.game_date, list);
    }
    return map;
  }, [games]);

  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: { key: string; day: number | null }[] = [];
  for (let i = 0; i < firstDow; i++)
    cells.push({ key: `pad-${year}-${month}-${i}`, day: null });
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({
      key: `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      day: d,
    });

  const goMonth = (delta: number) => {
    let m = month + delta;
    let y = year;
    if (m < 0) {
      m = 11;
      y--;
    } else if (m > 11) {
      m = 0;
      y++;
    }
    setMonth(m);
    setYear(y);
    setOpenDate(null);
  };

  const handleDateClick = (dateStr: string) => {
    const dayGames = gamesByDate.get(dateStr);
    if (!dayGames || dayGames.length === 0) return;
    if (dayGames.length === 1) {
      router.push(`/games/${dayGames[0].id}`);
    } else {
      setOpenDate(openDate === dateStr ? null : dateStr);
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {/* ナビ */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <button
          type="button"
          onClick={() => goMonth(-1)}
          className="rounded p-1 text-gray-500 hover:bg-gray-100"
        >
          &larr;
        </button>
        <span className="text-sm font-semibold">
          {year}年{month + 1}月
        </span>
        <button
          type="button"
          onClick={() => goMonth(1)}
          className="rounded p-1 text-gray-500 hover:bg-gray-100"
        >
          &rarr;
        </button>
      </div>

      {/* 曜日ヘッダー */}
      <div className="grid grid-cols-7 border-b bg-gray-50 text-center text-xs text-gray-500">
        {DOW_LABELS.map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>

      {/* 日付グリッド */}
      <div className="grid grid-cols-7">
        {cells.map((cell) => {
          if (cell.day === null) {
            return (
              <div
                key={cell.key}
                className="min-h-[3rem] border-b border-r border-gray-100"
              />
            );
          }
          const day = cell.day;
          const dateStr = cell.key;
          const dayGames = gamesByDate.get(dateStr);
          const isToday = dateStr === todayStr;
          const hasGames = dayGames && dayGames.length > 0;

          return (
            <div
              key={dateStr}
              className={`relative min-h-[3rem] border-b border-r border-gray-100 p-1 text-sm ${
                isToday ? "bg-blue-50" : ""
              } ${hasGames ? "cursor-pointer hover:bg-gray-50" : ""}`}
              onClick={() => hasGames && handleDateClick(dateStr)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && hasGames) handleDateClick(dateStr);
              }}
              role={hasGames ? "button" : undefined}
              tabIndex={hasGames ? 0 : undefined}
            >
              <span
                className={`text-xs ${isToday ? "font-bold text-blue-700" : "text-gray-700"}`}
              >
                {day}
              </span>
              {dayGames && (
                <div className="mt-0.5 flex gap-0.5">
                  {dayGames.map((g) => (
                    <span
                      key={g.id}
                      className={`block h-1.5 w-1.5 rounded-full ${STATUS_DOT_COLORS[g.status] ?? "bg-gray-400"}`}
                      title={g.title}
                    />
                  ))}
                </div>
              )}

              {/* 複数試合ドロップダウン */}
              {openDate === dateStr && dayGames && dayGames.length > 1 && (
                <div className="absolute left-0 top-full z-10 mt-1 w-48 rounded-lg border bg-white py-1 shadow-lg">
                  {dayGames.map((g) => (
                    <a
                      key={g.id}
                      href={`/games/${g.id}`}
                      className="block px-3 py-1.5 text-xs hover:bg-gray-50"
                    >
                      <span
                        className={`mr-1.5 inline-block h-2 w-2 rounded-full ${STATUS_DOT_COLORS[g.status] ?? "bg-gray-400"}`}
                      />
                      {g.title}
                    </a>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
