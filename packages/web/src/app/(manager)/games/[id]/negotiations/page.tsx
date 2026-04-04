import { createClient } from "@/lib/supabase/server";
import Box from "@cloudscape-design/components/box";
import BreadcrumbGroup from "@cloudscape-design/components/breadcrumb-group";
import Container from "@cloudscape-design/components/container";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import Link from "@cloudscape-design/components/link";
import SpaceBetween from "@cloudscape-design/components/space-between";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Table from "@cloudscape-design/components/table";
import { NegotiationActions } from "./NegotiationActions";
import { NewNegotiationForm } from "./NewNegotiationForm";

const NEGOTIATION_STATUS_TYPE: Record<
  string,
  "success" | "info" | "warning" | "error" | "stopped" | "pending"
> = {
  DRAFT: "pending",
  SENT: "info",
  REPLIED: "warning",
  ACCEPTED: "success",
  DECLINED: "error",
  CANCELLED: "stopped",
};

const NEGOTIATION_STATUS_LABELS: Record<string, string> = {
  DRAFT: "下書き",
  SENT: "送信済み",
  REPLIED: "返信あり",
  ACCEPTED: "承諾",
  DECLINED: "辞退",
  CANCELLED: "キャンセル",
};

export default async function NegotiationsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: game } = await supabase
    .from("games")
    .select("*, teams(id, name)")
    .eq("id", id)
    .single();

  if (!game) {
    return (
      <ContentLayout header={<Header variant="h1">交渉管理</Header>}>
        <Box textAlign="center" color="text-status-inactive" padding="xxl">
          試合が見つかりません
        </Box>
      </ContentLayout>
    );
  }

  const team = game.teams as { id: string; name: string } | null;

  const { data: negotiations } = await supabase
    .from("negotiations")
    .select("*, opponent_teams(name)")
    .eq("game_id", id)
    .order("created_at", { ascending: false });

  const { data: opponents } = await supabase
    .from("opponent_teams")
    .select("id, name")
    .eq("team_id", game.team_id)
    .order("name");

  return (
    <ContentLayout
      breadcrumbs={
        <BreadcrumbGroup
          items={[
            { text: "ダッシュボード", href: "/dashboard" },
            { text: game.title, href: `/games/${id}` },
            { text: "交渉管理", href: `/games/${id}/negotiations` },
          ]}
        />
      }
      header={
        <Header
          variant="h1"
          description={<Link href={`/games/${id}`}>試合詳細に戻る</Link>}
        >
          {game.title} — 交渉管理
        </Header>
      }
    >
      <SpaceBetween size="l">
        <NewNegotiationForm
          gameId={id}
          teamName={team?.name ?? ""}
          opponents={opponents ?? []}
        />

        {negotiations && negotiations.length > 0 ? (
          <Table
            header={
              <Header variant="h2" counter={`(${negotiations.length})`}>
                交渉一覧
              </Header>
            }
            columnDefinitions={[
              {
                id: "opponent",
                header: "対戦相手",
                cell: (item) => {
                  const opponent = item.opponent_teams as {
                    name: string;
                  } | null;
                  return opponent?.name ?? "—";
                },
              },
              {
                id: "status",
                header: "ステータス",
                cell: (item) => (
                  <StatusIndicator
                    type={NEGOTIATION_STATUS_TYPE[item.status] ?? "pending"}
                  >
                    {NEGOTIATION_STATUS_LABELS[item.status] ?? item.status}
                  </StatusIndicator>
                ),
              },
              {
                id: "proposed_dates",
                header: "候補日",
                cell: (item) => {
                  const dates = item.proposed_dates_json as string[] | null;
                  return dates?.join(", ") ?? "—";
                },
              },
              {
                id: "message_sent",
                header: "送信メッセージ",
                cell: (item) =>
                  item.message_sent
                    ? `${String(item.message_sent).slice(0, 50)}...`
                    : "—",
              },
              {
                id: "reply_received",
                header: "返信",
                cell: (item) =>
                  item.reply_received
                    ? `${String(item.reply_received).slice(0, 50)}...`
                    : "—",
              },
              {
                id: "actions",
                header: "アクション",
                cell: (item) => (
                  <NegotiationActions
                    negotiationId={item.id}
                    gameId={id}
                    currentStatus={item.status}
                  />
                ),
              },
            ]}
            items={negotiations}
            variant="embedded"
          />
        ) : (
          <Container header={<Header variant="h2">交渉一覧</Header>}>
            <Box textAlign="center" color="text-status-inactive" padding="l">
              交渉がまだありません。上のフォームから新しい交渉を開始してください。
            </Box>
          </Container>
        )}
      </SpaceBetween>
    </ContentLayout>
  );
}
