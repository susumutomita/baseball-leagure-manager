"use client";

import Header from "@cloudscape-design/components/header";
import Link from "@cloudscape-design/components/link";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Table from "@cloudscape-design/components/table";
import Tabs from "@cloudscape-design/components/tabs";
import { Calendar } from "./Calendar";
import type { CalendarGame } from "./Calendar";

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

const GAME_TYPE_LABELS: Record<string, string> = {
  PRACTICE: "練習",
  FRIENDLY: "練習試合",
  LEAGUE: "リーグ戦",
  TOURNAMENT: "トーナメント",
};

const STATUS_TYPE: Record<
  string,
  "success" | "info" | "warning" | "error" | "stopped" | "pending"
> = {
  DRAFT: "pending",
  COLLECTING: "info",
  CONFIRMED: "success",
  COMPLETED: "success",
  SETTLED: "stopped",
  CANCELLED: "error",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "下書き",
  COLLECTING: "出欠収集中",
  CONFIRMED: "確定",
  COMPLETED: "完了",
  SETTLED: "精算済み",
  CANCELLED: "中止",
};

export function DashboardView({ games, calendarGames }: DashboardViewProps) {
  return (
    <Tabs
      tabs={[
        {
          id: "calendar",
          label: "カレンダー",
          content: <Calendar games={calendarGames} />,
        },
        {
          id: "table",
          label: "一覧",
          content: (
            <Table
              header={<Header counter={`(${games.length})`}>試合一覧</Header>}
              columnDefinitions={[
                {
                  id: "title",
                  header: "タイトル",
                  cell: (item) => (
                    <Link href={`/games/${item.id}`}>{item.title}</Link>
                  ),
                  sortingField: "title",
                },
                {
                  id: "game_type",
                  header: "種別",
                  cell: (item) =>
                    GAME_TYPE_LABELS[item.game_type] ?? item.game_type,
                },
                {
                  id: "status",
                  header: "ステータス",
                  cell: (item) => (
                    <StatusIndicator type={STATUS_TYPE[item.status] ?? "info"}>
                      {STATUS_LABELS[item.status] ?? item.status}
                    </StatusIndicator>
                  ),
                },
                {
                  id: "game_date",
                  header: "試合日",
                  cell: (item) => item.game_date ?? "未定",
                  sortingField: "game_date",
                },
                {
                  id: "rsvp",
                  header: "出欠",
                  cell: (item) =>
                    `参加${item.available_count} / 不参加${item.unavailable_count} / 未${item.no_response_count}`,
                },
              ]}
              items={games}
              empty="試合がありません"
              variant="full-page"
              stickyHeader
            />
          ),
        },
      ]}
    />
  );
}
