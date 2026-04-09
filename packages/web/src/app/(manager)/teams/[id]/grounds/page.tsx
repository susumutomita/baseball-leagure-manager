import { GroundsList } from "@/components/GroundsList";
import { createClient } from "@/lib/supabase/server";
import BreadcrumbGroup from "@cloudscape-design/components/breadcrumb-group";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";

export default async function GroundsPage({
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

  const { data: grounds } = await supabase
    .from("grounds")
    .select("*")
    .eq("team_id", id)
    .order("name");

  return (
    <ContentLayout
      breadcrumbs={
        <BreadcrumbGroup
          items={[
            { text: "ダッシュボード", href: "/dashboard" },
            { text: team?.name ?? "チーム", href: `/teams/${id}` },
            { text: "グラウンド管理", href: `/teams/${id}/grounds` },
          ]}
        />
      }
      header={
        <Header variant="h1" description={team?.name ?? ""}>
          グラウンド管理
        </Header>
      }
    >
      <GroundsList initialGrounds={grounds ?? []} />
    </ContentLayout>
  );
}
