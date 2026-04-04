"use client";

import Box from "@cloudscape-design/components/box";
import BreadcrumbGroup from "@cloudscape-design/components/breadcrumb-group";
import Button from "@cloudscape-design/components/button";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import Link from "@cloudscape-design/components/link";
import Pagination from "@cloudscape-design/components/pagination";
import Select, { type SelectProps } from "@cloudscape-design/components/select";
import SpaceBetween from "@cloudscape-design/components/space-between";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Table from "@cloudscape-design/components/table";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

const TEAM_ID = process.env.NEXT_PUBLIC_DEFAULT_TEAM_ID ?? "";

interface GameRow {
  id: string;
  title: string;
  game_date: string | null;
  game_type: string;
  status: string;
  ground_name: string | null;
  available_count: number;
  min_players: number;
}

const STATUS_TYPE: Record<
  string,
  "success" | "info" | "warning" | "error" | "stopped" | "pending"
> = {
  DRAFT: "pending",
  COLLECTING: "info",
  ASSESSING: "info",
  ARRANGING: "info",
  CONFIRMED: "success",
  COMPLETED: "success",
  SETTLED: "stopped",
  CANCELLED: "error",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "下書き",
  COLLECTING: "出欠収集中",
  ASSESSING: "査定中",
  ARRANGING: "手配中",
  CONFIRMED: "確定",
  COMPLETED: "完了",
  SETTLED: "精算済み",
  CANCELLED: "中止",
};

const ALL_OPTION: SelectProps.Option = { label: "すべて", value: "ALL" };

const STATUS_FILTER_OPTIONS: SelectProps.Option[] = [
  ALL_OPTION,
  { label: "下書き", value: "DRAFT" },
  { label: "出欠収集中", value: "COLLECTING" },
  { label: "確定", value: "CONFIRMED" },
  { label: "完了", value: "COMPLETED" },
  { label: "精算済み", value: "SETTLED" },
  { label: "中止", value: "CANCELLED" },
];

const PAGE_SIZE = 20;

export default function GamesListPage() {
  const router = useRouter();
  const [games, setGames] = useState<GameRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] =
    useState<SelectProps.Option>(ALL_OPTION);
  const [currentPage, setCurrentPage] = useState(1);

  const loadGames = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/games?team_id=${TEAM_ID}&limit=100`);
      if (res.ok) {
        const json = await res.json();
        setGames(json.data ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadGames();
  }, [loadGames]);

  const filteredGames =
    statusFilter.value === "ALL"
      ? games
      : games.filter((g) => g.status === statusFilter.value);

  const totalPages = Math.max(1, Math.ceil(filteredGames.length / PAGE_SIZE));
  const paginatedGames = filteredGames.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  );

  return (
    <ContentLayout
      breadcrumbs={
        <BreadcrumbGroup
          items={[
            { text: "ダッシュボード", href: "/dashboard" },
            { text: "試合一覧", href: "/games" },
          ]}
        />
      }
      header={
        <Header
          variant="h1"
          actions={
            <Button variant="primary" onClick={() => router.push("/games/new")}>
              試合を作成
            </Button>
          }
          counter={`(${filteredGames.length})`}
        >
          試合一覧
        </Header>
      }
    >
      <SpaceBetween size="l">
        <Table
          header={
            <Header
              variant="h2"
              actions={
                <Select
                  selectedOption={statusFilter}
                  onChange={({ detail }) => {
                    setStatusFilter(detail.selectedOption);
                    setCurrentPage(1);
                  }}
                  options={STATUS_FILTER_OPTIONS}
                />
              }
            >
              試合
            </Header>
          }
          loading={loading}
          loadingText="読み込み中..."
          columnDefinitions={[
            {
              id: "date",
              header: "試合日",
              cell: (item) => item.game_date ?? "未定",
              width: 120,
              sortingField: "game_date",
            },
            {
              id: "title",
              header: "タイトル",
              cell: (item) => (
                <Link href={`/games/${item.id}`}>{item.title}</Link>
              ),
              width: 250,
            },
            {
              id: "status",
              header: "ステータス",
              cell: (item) => (
                <StatusIndicator type={STATUS_TYPE[item.status] ?? "info"}>
                  {STATUS_LABELS[item.status] ?? item.status}
                </StatusIndicator>
              ),
              width: 140,
            },
            {
              id: "type",
              header: "種別",
              cell: (item) => item.game_type,
              width: 100,
            },
            {
              id: "ground",
              header: "グラウンド",
              cell: (item) => item.ground_name ?? "---",
              width: 160,
            },
            {
              id: "players",
              header: "出欠",
              cell: (item) => (
                <StatusIndicator
                  type={
                    item.available_count >= item.min_players
                      ? "success"
                      : "warning"
                  }
                >
                  {item.available_count}/{item.min_players}人
                </StatusIndicator>
              ),
              width: 100,
            },
          ]}
          items={paginatedGames}
          onRowClick={({ detail }) => router.push(`/games/${detail.item.id}`)}
          variant="full-page"
          empty={
            <Box textAlign="center" color="text-status-inactive" padding="xxl">
              <SpaceBetween size="m">
                <b>試合がありません</b>
                <Button onClick={() => router.push("/games/new")}>
                  試合を作成する
                </Button>
              </SpaceBetween>
            </Box>
          }
          pagination={
            <Pagination
              currentPageIndex={currentPage}
              pagesCount={totalPages}
              onChange={({ detail }) => setCurrentPage(detail.currentPageIndex)}
            />
          }
        />
      </SpaceBetween>
    </ContentLayout>
  );
}
