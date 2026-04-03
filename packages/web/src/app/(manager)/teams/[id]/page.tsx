import { createClient } from "@/lib/supabase/server";
import Box from "@cloudscape-design/components/box";
import BreadcrumbGroup from "@cloudscape-design/components/breadcrumb-group";
import Cards from "@cloudscape-design/components/cards";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Container from "@cloudscape-design/components/container";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import KeyValuePairs from "@cloudscape-design/components/key-value-pairs";
import Link from "@cloudscape-design/components/link";
import SpaceBetween from "@cloudscape-design/components/space-between";
import StatusIndicator from "@cloudscape-design/components/status-indicator";

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "管理者(代表)",
  ADMIN: "管理者",
  MEMBER: "メンバー",
};

const ROLE_TYPE: Record<
  string,
  "success" | "info" | "warning" | "error" | "stopped" | "pending"
> = {
  SUPER_ADMIN: "success",
  ADMIN: "info",
  MEMBER: "pending",
};

export default async function TeamDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: team } = await supabase
    .from("teams")
    .select("*")
    .eq("id", id)
    .single();

  if (!team) {
    return (
      <ContentLayout header={<Header variant="h1">チーム詳細</Header>}>
        <Box textAlign="center" color="text-status-inactive" padding="xxl">
          チームが見つかりません
        </Box>
      </ContentLayout>
    );
  }

  const { data: members } = await supabase
    .from("members")
    .select("*")
    .eq("team_id", id)
    .eq("status", "ACTIVE")
    .order("role")
    .order("name");

  return (
    <ContentLayout
      breadcrumbs={
        <BreadcrumbGroup
          items={[
            { text: "ダッシュボード", href: "/" },
            { text: team.name, href: `/teams/${id}` },
          ]}
        />
      }
      header={
        <Header
          variant="h1"
          actions={
            <SpaceBetween direction="horizontal" size="xs">
              <Link href={`/teams/${id}/helpers`} variant="primary">
                助っ人管理
              </Link>
              <Link href={`/teams/${id}/opponents`} variant="primary">
                対戦相手
              </Link>
            </SpaceBetween>
          }
        >
          {team.name}
        </Header>
      }
    >
      <SpaceBetween size="l">
        <Container header={<Header variant="h2">チーム情報</Header>}>
          <ColumnLayout columns={2} variant="text-grid">
            <KeyValuePairs
              items={[
                { label: "活動エリア", value: team.home_area },
                { label: "活動日", value: team.activity_day ?? "未設定" },
              ]}
            />
            <KeyValuePairs
              items={[
                {
                  label: "メンバー数",
                  value: `${members?.length ?? 0}人`,
                },
              ]}
            />
          </ColumnLayout>
        </Container>

        <Cards
          header={
            <Header counter={`(${members?.length ?? 0})`}>メンバー</Header>
          }
          cardDefinition={{
            header: (item) => item.name,
            sections: [
              {
                id: "role",
                header: "ロール",
                content: (item) => (
                  <StatusIndicator type={ROLE_TYPE[item.role] ?? "pending"}>
                    {ROLE_LABELS[item.role] ?? item.role}
                  </StatusIndicator>
                ),
              },
              {
                id: "positions",
                header: "ポジション",
                content: (item) => {
                  const positions = item.positions_json as string[];
                  return positions?.join(", ") || "—";
                },
              },
              {
                id: "attendance",
                header: "出席率",
                content: (item) => `${item.attendance_rate}%`,
              },
              {
                id: "tier",
                header: "区分",
                content: (item) => item.tier,
              },
            ],
          }}
          items={members ?? []}
          empty={
            <Box textAlign="center" color="text-body-secondary" padding="xxl">
              メンバーがいません
            </Box>
          }
        />
      </SpaceBetween>
    </ContentLayout>
  );
}
