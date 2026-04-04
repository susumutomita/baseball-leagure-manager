import { createClient } from "@/lib/supabase/server";
import Box from "@cloudscape-design/components/box";
import BreadcrumbGroup from "@cloudscape-design/components/breadcrumb-group";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import Link from "@cloudscape-design/components/link";
import SpaceBetween from "@cloudscape-design/components/space-between";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Table from "@cloudscape-design/components/table";

const HELPER_REQUEST_STATUS_TYPE: Record<
  string,
  "success" | "info" | "warning" | "error" | "stopped" | "pending"
> = {
  PENDING: "pending",
  ACCEPTED: "success",
  DECLINED: "error",
  CANCELLED: "stopped",
};

const HELPER_REQUEST_STATUS_LABELS: Record<string, string> = {
  PENDING: "打診中",
  ACCEPTED: "承諾",
  DECLINED: "辞退",
  CANCELLED: "キャンセル",
};

export default async function GameHelpersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: game } = await supabase
    .from("games")
    .select("id, title, team_id")
    .eq("id", id)
    .single();

  if (!game) {
    return (
      <ContentLayout header={<Header variant="h1">助っ人管理</Header>}>
        <Box textAlign="center" color="text-status-inactive" padding="xxl">
          試合が見つかりません
        </Box>
      </ContentLayout>
    );
  }

  const { data: helperRequests } = await supabase
    .from("helper_requests")
    .select("*, helpers(name, note, reliability_score)")
    .eq("game_id", id)
    .order("created_at", { ascending: false });

  const requests = helperRequests ?? [];
  const summary = {
    pending: requests.filter((r) => r.status === "PENDING").length,
    accepted: requests.filter((r) => r.status === "ACCEPTED").length,
    declined: requests.filter((r) => r.status === "DECLINED").length,
    cancelled: requests.filter((r) => r.status === "CANCELLED").length,
    total: requests.length,
  };

  // チームの助っ人一覧 (新規打診用)
  const { data: helpers } = await supabase
    .from("helpers")
    .select("id, name, reliability_score")
    .eq("team_id", game.team_id)
    .order("reliability_score", { ascending: false });

  // 既に打診済みの助っ人IDを除外
  const requestedHelperIds = new Set(requests.map((r) => r.helper_id));
  const availableHelpers = (helpers ?? []).filter(
    (h) => !requestedHelperIds.has(h.id),
  );

  return (
    <ContentLayout
      breadcrumbs={
        <BreadcrumbGroup
          items={[
            { text: "ダッシュボード", href: "/dashboard" },
            { text: game.title, href: `/games/${id}` },
            { text: "助っ人管理", href: `/games/${id}/helpers` },
          ]}
        />
      }
      header={
        <Header
          variant="h1"
          counter={requests.length > 0 ? `(${requests.length})` : undefined}
          description={`${game.title} の助っ人打診状況`}
        >
          助っ人管理
        </Header>
      }
    >
      <SpaceBetween size="l">
        <Container header={<Header variant="h2">打診サマリ</Header>}>
          <SpaceBetween direction="horizontal" size="xl">
            <Box>
              <Box variant="awsui-key-label">打診中</Box>
              <Box fontSize="display-l" fontWeight="bold">
                {summary.pending}
              </Box>
            </Box>
            <Box>
              <Box variant="awsui-key-label">承諾</Box>
              <Box
                fontSize="display-l"
                fontWeight="bold"
                color="text-status-success"
              >
                {summary.accepted}
              </Box>
            </Box>
            <Box>
              <Box variant="awsui-key-label">辞退</Box>
              <Box
                fontSize="display-l"
                fontWeight="bold"
                color="text-status-error"
              >
                {summary.declined}
              </Box>
            </Box>
            <Box>
              <Box variant="awsui-key-label">キャンセル</Box>
              <Box fontSize="display-l" fontWeight="bold">
                {summary.cancelled}
              </Box>
            </Box>
          </SpaceBetween>
        </Container>

        {requests.length > 0 ? (
          <Table
            header={
              <Header variant="h2" counter={`(${requests.length})`}>
                打診一覧
              </Header>
            }
            columnDefinitions={[
              {
                id: "name",
                header: "助っ人名",
                cell: (item) => {
                  const helper = item.helpers as {
                    name: string;
                    note: string | null;
                    reliability_score: number;
                  } | null;
                  return helper?.name ?? "—";
                },
                sortingField: "name",
              },
              {
                id: "reliability",
                header: "信頼度",
                cell: (item) => {
                  const helper = item.helpers as {
                    name: string;
                    note: string | null;
                    reliability_score: number;
                  } | null;
                  if (!helper) return "—";
                  const score = Number(helper.reliability_score);
                  const type =
                    score >= 0.8
                      ? "success"
                      : score >= 0.5
                        ? "warning"
                        : "error";
                  return (
                    <StatusIndicator
                      type={type as "success" | "warning" | "error"}
                    >
                      {(score * 100).toFixed(0)}%
                    </StatusIndicator>
                  );
                },
              },
              {
                id: "status",
                header: "ステータス",
                cell: (item) => (
                  <StatusIndicator
                    type={HELPER_REQUEST_STATUS_TYPE[item.status] ?? "pending"}
                  >
                    {HELPER_REQUEST_STATUS_LABELS[item.status] ?? item.status}
                  </StatusIndicator>
                ),
              },
              {
                id: "sent_at",
                header: "打診日",
                cell: (item) =>
                  item.sent_at
                    ? new Date(item.sent_at).toLocaleDateString("ja-JP")
                    : "—",
              },
              {
                id: "responded_at",
                header: "回答日",
                cell: (item) =>
                  item.responded_at
                    ? new Date(item.responded_at).toLocaleDateString("ja-JP")
                    : "—",
              },
              {
                id: "message",
                header: "メッセージ",
                cell: (item) => item.message ?? "—",
                maxWidth: 200,
              },
            ]}
            items={requests}
            variant="embedded"
          />
        ) : (
          <Container header={<Header variant="h2">打診一覧</Header>}>
            <Box textAlign="center" color="text-status-inactive" padding="l">
              助っ人への打診がありません
            </Box>
          </Container>
        )}

        <Container
          header={
            <Header
              variant="h2"
              description="まだ打診していない助っ人の一覧です"
            >
              新規打診
            </Header>
          }
        >
          {availableHelpers.length > 0 ? (
            <Table
              columnDefinitions={[
                {
                  id: "name",
                  header: "助っ人名",
                  cell: (item) => item.name,
                },
                {
                  id: "reliability",
                  header: "信頼度",
                  cell: (item) => {
                    const score = Number(item.reliability_score);
                    const type =
                      score >= 0.8
                        ? "success"
                        : score >= 0.5
                          ? "warning"
                          : "error";
                    return (
                      <StatusIndicator
                        type={type as "success" | "warning" | "error"}
                      >
                        {(score * 100).toFixed(0)}%
                      </StatusIndicator>
                    );
                  },
                },
              ]}
              items={availableHelpers}
              variant="embedded"
            />
          ) : (
            <Box textAlign="center" color="text-status-inactive" padding="l">
              {(helpers ?? []).length === 0
                ? "チームに助っ人が登録されていません"
                : "すべての助っ人に打診済みです"}
            </Box>
          )}
        </Container>

        <Box>
          <Link href={`/games/${id}`}>
            <Button variant="link">試合詳細に戻る</Button>
          </Link>
        </Box>
      </SpaceBetween>
    </ContentLayout>
  );
}
