import { createClient } from "@/lib/supabase/server";
import Box from "@cloudscape-design/components/box";
import BreadcrumbGroup from "@cloudscape-design/components/breadcrumb-group";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import Link from "@cloudscape-design/components/link";
import Table from "@cloudscape-design/components/table";

export default async function OpponentsPage({
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

  const { data: opponents } = await supabase
    .from("opponent_teams")
    .select("*")
    .eq("team_id", id)
    .order("times_played", { ascending: false });

  return (
    <ContentLayout
      breadcrumbs={
        <BreadcrumbGroup
          items={[
            { text: "ダッシュボード", href: "/dashboard" },
            { text: team?.name ?? "チーム", href: `/teams/${id}` },
            { text: "対戦相手", href: `/teams/${id}/opponents` },
          ]}
        />
      }
      header={
        <Header
          variant="h1"
          description={team?.name ?? ""}
          actions={<Link href={`/teams/${id}`}>チームに戻る</Link>}
        >
          対戦相手
        </Header>
      }
    >
      <Table
        header={
          <Header counter={`(${opponents?.length ?? 0})`}>対戦相手一覧</Header>
        }
        columnDefinitions={[
          {
            id: "name",
            header: "チーム名",
            cell: (item) => item.name,
            sortingField: "name",
          },
          {
            id: "area",
            header: "エリア",
            cell: (item) => item.area ?? "—",
          },
          {
            id: "contact_name",
            header: "連絡先",
            cell: (item) => item.contact_name ?? "—",
          },
          {
            id: "times_played",
            header: "対戦回数",
            cell: (item) => `${item.times_played}回`,
            sortingField: "times_played",
          },
          {
            id: "last_played_at",
            header: "最終対戦",
            cell: (item) => item.last_played_at ?? "—",
          },
          {
            id: "note",
            header: "メモ",
            cell: (item) => item.note ?? "—",
          },
        ]}
        items={opponents ?? []}
        empty={
          <Box textAlign="center" color="text-body-secondary" padding="xxl">
            対戦相手が登録されていません
          </Box>
        }
        variant="full-page"
        stickyHeader
      />
    </ContentLayout>
  );
}
