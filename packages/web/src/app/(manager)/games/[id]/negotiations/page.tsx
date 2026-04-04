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
  ACCEPTED: "成立",
  DECLINED: "不成立",
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
    .select("id, title")
    .eq("id", id)
    .single();

  if (!game) {
    return (
      <ContentLayout header={<Header variant="h1">対戦交渉</Header>}>
        <Box textAlign="center" color="text-status-inactive" padding="xxl">
          試合が見つかりません
        </Box>
      </ContentLayout>
    );
  }

  const { data: negotiations } = await supabase
    .from("negotiations")
    .select("*, opponent_teams(name, area, contact_name)")
    .eq("game_id", id)
    .order("created_at", { ascending: false });

  return (
    <ContentLayout
      breadcrumbs={
        <BreadcrumbGroup
          items={[
            { text: "ダッシュボード", href: "/dashboard" },
            { text: game.title, href: `/games/${id}` },
            { text: "対戦交渉", href: `/games/${id}/negotiations` },
          ]}
        />
      }
      header={
        <Header
          variant="h1"
          counter={
            negotiations && negotiations.length > 0
              ? `(${negotiations.length})`
              : undefined
          }
          description={`${game.title} の対戦交渉一覧`}
        >
          対戦交渉
        </Header>
      }
    >
      <SpaceBetween size="l">
        {negotiations && negotiations.length > 0 ? (
          <Table
            columnDefinitions={[
              {
                id: "opponent",
                header: "対戦相手",
                cell: (item) => {
                  const opponent = item.opponent_teams as {
                    name: string;
                    area: string;
                    contact_name: string;
                  } | null;
                  return opponent?.name ?? "—";
                },
              },
              {
                id: "area",
                header: "地域",
                cell: (item) => {
                  const opponent = item.opponent_teams as {
                    name: string;
                    area: string;
                    contact_name: string;
                  } | null;
                  return opponent?.area ?? "—";
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
                id: "sent_at",
                header: "送信日",
                cell: (item) =>
                  item.sent_at
                    ? new Date(item.sent_at).toLocaleDateString("ja-JP")
                    : "—",
              },
              {
                id: "replied_at",
                header: "返信日",
                cell: (item) =>
                  item.replied_at
                    ? new Date(item.replied_at).toLocaleDateString("ja-JP")
                    : "—",
              },
              {
                id: "message",
                header: "メッセージ",
                cell: (item) => item.message_sent ?? "—",
                maxWidth: 200,
              },
            ]}
            items={negotiations}
            variant="embedded"
          />
        ) : (
          <Container header={<Header variant="h2">交渉一覧</Header>}>
            <Box textAlign="center" color="text-status-inactive" padding="l">
              対戦交渉がありません
            </Box>
            <Box textAlign="center" padding="s">
              <Link href={`/games/${id}`}>試合詳細に戻る</Link>
            </Box>
          </Container>
        )}
      </SpaceBetween>
    </ContentLayout>
  );
}
