import { TransitionButtons } from "@/components/TransitionButtons";
import { createClient } from "@/lib/supabase/server";
import Box from "@cloudscape-design/components/box";
import BreadcrumbGroup from "@cloudscape-design/components/breadcrumb-group";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Container from "@cloudscape-design/components/container";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import KeyValuePairs from "@cloudscape-design/components/key-value-pairs";
import Link from "@cloudscape-design/components/link";
import SpaceBetween from "@cloudscape-design/components/space-between";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Table from "@cloudscape-design/components/table";
import { getAvailableTransitions } from "@match-engine/core";
import type { GameStatus } from "@match-engine/core";

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

const RSVP_STATUS_TYPE: Record<
  string,
  "success" | "info" | "warning" | "error" | "stopped" | "pending"
> = {
  AVAILABLE: "success",
  UNAVAILABLE: "error",
  MAYBE: "warning",
  NO_RESPONSE: "pending",
};

const RSVP_LABELS: Record<string, string> = {
  AVAILABLE: "参加",
  UNAVAILABLE: "不参加",
  MAYBE: "未定",
  NO_RESPONSE: "未回答",
};

export default async function GameDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: game } = await supabase
    .from("games")
    .select("*")
    .eq("id", id)
    .single();

  if (!game) {
    return (
      <ContentLayout header={<Header variant="h1">試合詳細</Header>}>
        <Box textAlign="center" color="text-status-inactive" padding="xxl">
          試合が見つかりません
        </Box>
      </ContentLayout>
    );
  }

  const { data: rsvps } = await supabase
    .from("rsvps")
    .select("*, members(name, tier)")
    .eq("game_id", id);

  const transitions = getAvailableTransitions(game.status as GameStatus);

  return (
    <ContentLayout
      breadcrumbs={
        <BreadcrumbGroup
          items={[
            { text: "ダッシュボード", href: "/dashboard" },
            { text: game.title, href: `/games/${id}` },
          ]}
        />
      }
      header={
        <Header
          variant="h1"
          info={
            <StatusIndicator type={STATUS_TYPE[game.status] ?? "info"}>
              {STATUS_LABELS[game.status] ?? game.status}
            </StatusIndicator>
          }
        >
          {game.title}
        </Header>
      }
    >
      <SpaceBetween size="l">
        <Container header={<Header variant="h2">試合情報</Header>}>
          <ColumnLayout columns={2} variant="text-grid">
            <KeyValuePairs
              items={[
                { label: "試合日", value: game.game_date ?? "未定" },
                { label: "開始時刻", value: game.start_time ?? "未定" },
                { label: "グラウンド", value: game.ground_name ?? "未定" },
                { label: "最低人数", value: `${game.min_players}人` },
              ]}
            />
            <KeyValuePairs
              items={[
                {
                  label: "参加",
                  value: (
                    <Box color="text-status-success">
                      {game.available_count}人
                    </Box>
                  ),
                },
                {
                  label: "不参加",
                  value: (
                    <Box color="text-status-error">
                      {game.unavailable_count}人
                    </Box>
                  ),
                },
                {
                  label: "未回答",
                  value: (
                    <Box color="text-status-inactive">
                      {game.no_response_count}人
                    </Box>
                  ),
                },
                { label: "種別", value: game.game_type },
              ]}
            />
          </ColumnLayout>
        </Container>

        <Container header={<Header variant="h2">アクション</Header>}>
          <SpaceBetween size="s">
            <TransitionButtons
              gameId={game.id}
              currentStatus={game.status}
              transitions={transitions}
            />
            {(game.status === "COMPLETED" || game.status === "SETTLED") && (
              <Link href={`/games/${game.id}/expenses`}>支出・精算を管理</Link>
            )}
          </SpaceBetween>
        </Container>

        {rsvps && rsvps.length > 0 && (
          <Table
            header={
              <Header
                variant="h2"
                counter={`(${rsvps.length})`}
                description="出欠の回答はLINEアプリから行えます"
              >
                出欠状況
              </Header>
            }
            columnDefinitions={[
              {
                id: "name",
                header: "名前",
                cell: (item) => {
                  const member = item.members as {
                    name: string;
                    tier: string;
                  } | null;
                  return member?.name ?? "—";
                },
              },
              {
                id: "tier",
                header: "区分",
                cell: (item) => {
                  const member = item.members as {
                    name: string;
                    tier: string;
                  } | null;
                  return member?.tier ?? "—";
                },
              },
              {
                id: "response",
                header: "回答",
                cell: (item) => (
                  <StatusIndicator
                    type={RSVP_STATUS_TYPE[item.response] ?? "pending"}
                  >
                    {RSVP_LABELS[item.response] ?? item.response}
                  </StatusIndicator>
                ),
              },
            ]}
            items={rsvps}
            variant="embedded"
          />
        )}
      </SpaceBetween>
    </ContentLayout>
  );
}
