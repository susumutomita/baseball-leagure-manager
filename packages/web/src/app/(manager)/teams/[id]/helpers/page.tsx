import { createClient } from "@/lib/supabase/server";
import Box from "@cloudscape-design/components/box";
import BreadcrumbGroup from "@cloudscape-design/components/breadcrumb-group";
import Cards from "@cloudscape-design/components/cards";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import Link from "@cloudscape-design/components/link";
import StatusIndicator from "@cloudscape-design/components/status-indicator";

export default async function HelpersPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: team } = await supabase
    .from("teams")
    .select("name")
    .eq("id", id)
    .single();

  const { data: helpers } = await supabase
    .from("helpers")
    .select("*")
    .eq("team_id", id)
    .order("reliability_score", { ascending: false });

  return (
    <ContentLayout
      breadcrumbs={
        <BreadcrumbGroup
          items={[
            { text: "ダッシュボード", href: "/" },
            { text: team?.name ?? "チーム", href: `/teams/${id}` },
            { text: "助っ人管理", href: `/teams/${id}/helpers` },
          ]}
        />
      }
      header={
        <Header
          variant="h1"
          description={team?.name ?? ""}
          actions={<Link href={`/teams/${id}`}>チームに戻る</Link>}
        >
          助っ人管理
        </Header>
      }
    >
      <Cards
        header={
          <Header counter={`(${helpers?.length ?? 0})`}>助っ人一覧</Header>
        }
        cardDefinition={{
          header: (item) => item.name,
          sections: [
            {
              id: "reliability",
              header: "信頼度",
              content: (item) => {
                const score = Number(item.reliability_score);
                const type =
                  score >= 0.8 ? "success" : score >= 0.5 ? "warning" : "error";
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
              id: "times_helped",
              header: "参加回数",
              content: (item) => `${item.times_helped}回`,
            },
            {
              id: "note",
              header: "メモ",
              content: (item) => item.note || "—",
            },
            {
              id: "contact",
              header: "連絡先",
              content: (item) =>
                item.line_user_id ? "LINE" : item.email ? "メール" : "—",
            },
          ],
        }}
        items={helpers ?? []}
        empty={
          <Box textAlign="center" color="text-body-secondary" padding="xxl">
            助っ人が登録されていません
          </Box>
        }
      />
    </ContentLayout>
  );
}
