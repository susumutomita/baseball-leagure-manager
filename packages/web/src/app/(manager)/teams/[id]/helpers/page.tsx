import { HelpersList } from "@/components/HelpersList";
import { createClient } from "@/lib/supabase/server";
import BreadcrumbGroup from "@cloudscape-design/components/breadcrumb-group";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import Link from "@cloudscape-design/components/link";

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
            { text: "ダッシュボード", href: "/dashboard" },
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
      <HelpersList initialHelpers={helpers ?? []} teamId={id} />
    </ContentLayout>
  );
}
