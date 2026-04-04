import { createClient } from "@/lib/supabase/server";
import Box from "@cloudscape-design/components/box";
import BreadcrumbGroup from "@cloudscape-design/components/breadcrumb-group";
import Cards from "@cloudscape-design/components/cards";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import StatusIndicator from "@cloudscape-design/components/status-indicator";

const TIME_SLOT_LABELS: Record<string, string> = {
  MORNING: "午前",
  AFTERNOON: "午後",
  EVENING: "夜間",
};

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

  // 各グラウンドの直近の空き状況を取得
  const today = new Date().toISOString().split("T")[0];
  const groundsWithSlots = [];
  for (const ground of grounds ?? []) {
    const { data: slots } = await supabase
      .from("ground_slots")
      .select("*")
      .eq("ground_id", ground.id)
      .gte("date", today)
      .eq("status", "AVAILABLE")
      .order("date")
      .limit(5);

    groundsWithSlots.push({
      ...ground,
      available_slots: slots ?? [],
    });
  }

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
      <Cards
        header={
          <Header counter={`(${groundsWithSlots.length})`}>
            グラウンド一覧
          </Header>
        }
        cardDefinition={{
          header: (item) => item.name,
          sections: [
            {
              id: "municipality",
              header: "自治体",
              content: (item) => item.municipality,
            },
            {
              id: "cost",
              header: "料金",
              content: (item) =>
                item.cost_per_slot
                  ? `¥${item.cost_per_slot.toLocaleString()}/枠`
                  : "—",
            },
            {
              id: "features",
              header: "設備",
              content: (item) => {
                const features = [];
                if (item.is_hardball_ok) features.push("硬式可");
                if (item.has_night_lights) features.push("照明あり");
                return features.length > 0 ? features.join(", ") : "—";
              },
            },
            {
              id: "watch",
              header: "監視",
              content: (item) => (
                <StatusIndicator
                  type={item.watch_active ? "success" : "stopped"}
                >
                  {item.watch_active ? "監視中" : "停止中"}
                </StatusIndicator>
              ),
            },
            {
              id: "available",
              header: "直近の空き",
              content: (item) => {
                if (item.available_slots.length === 0) {
                  return "空きなし";
                }
                return item.available_slots
                  .map(
                    (s: { date: string; time_slot: string }) =>
                      `${s.date} ${TIME_SLOT_LABELS[s.time_slot] ?? s.time_slot}`,
                  )
                  .join(", ");
              },
            },
          ],
        }}
        items={groundsWithSlots}
        empty={
          <Box textAlign="center" color="text-body-secondary" padding="xxl">
            グラウンドが登録されていません
          </Box>
        }
      />
    </ContentLayout>
  );
}
