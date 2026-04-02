import { DashboardView } from "@/components/DashboardView";
import { createClient } from "@/lib/supabase/server";
import Box from "@cloudscape-design/components/box";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Container from "@cloudscape-design/components/container";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";

export default async function DashboardPage() {
  const supabase = await createClient();
  const teamId = process.env.NEXT_PUBLIC_DEFAULT_TEAM_ID;

  const { data: games } = await supabase
    .from("games")
    .select("*")
    .eq("team_id", teamId)
    .order("created_at", { ascending: false })
    .limit(20);

  const { data: calendarGames } = await supabase
    .from("games")
    .select("id, title, game_date, status, game_type")
    .eq("team_id", teamId)
    .not("game_date", "is", null)
    .order("game_date", { ascending: true });

  const active =
    games?.filter(
      (g) =>
        !["CONFIRMED", "COMPLETED", "SETTLED", "CANCELLED"].includes(g.status),
    ) ?? [];
  const confirmed = games?.filter((g) => g.status === "CONFIRMED") ?? [];

  return (
    <ContentLayout
      header={
        <Header variant="h1" description="試合成立エンジン — 現在の状況">
          ダッシュボード
        </Header>
      }
    >
      <Box margin={{ bottom: "l" }}>
        <ColumnLayout columns={3}>
          <KpiCard label="進行中" value={active.length} />
          <KpiCard label="確定済み" value={confirmed.length} />
          <KpiCard label="全試合" value={games?.length ?? 0} />
        </ColumnLayout>
      </Box>

      <DashboardView
        games={(games ?? []).map((g) => ({
          id: g.id,
          title: g.title,
          game_type: g.game_type,
          status: g.status,
          game_date: g.game_date,
          available_count: g.available_count,
          unavailable_count: g.unavailable_count,
          no_response_count: g.no_response_count,
        }))}
        calendarGames={(calendarGames ?? []).map((g) => ({
          id: g.id,
          title: g.title,
          game_date: g.game_date,
          status: g.status,
          game_type: g.game_type,
        }))}
      />
    </ContentLayout>
  );
}

function KpiCard({ label, value }: { label: string; value: number }) {
  return (
    <Container>
      <Box variant="awsui-key-label">{label}</Box>
      <Box variant="h1" tagOverride="p">
        {value}
      </Box>
    </Container>
  );
}
