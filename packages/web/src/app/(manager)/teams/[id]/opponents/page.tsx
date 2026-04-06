import { OpponentsList } from "@/components/OpponentsList";
import { createClient } from "@/lib/supabase/server";
import BreadcrumbGroup from "@cloudscape-design/components/breadcrumb-group";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import Link from "@cloudscape-design/components/link";

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
      <OpponentsList initialOpponents={opponents ?? []} teamId={id} />
    </ContentLayout>
  );
}
