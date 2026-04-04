import { DashboardView } from "@/components/DashboardView";
import { OnboardingGuard } from "@/components/OnboardingGuard";
import { createClient } from "@/lib/supabase/server";
import Box from "@cloudscape-design/components/box";
import BreadcrumbGroup from "@cloudscape-design/components/breadcrumb-group";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Container from "@cloudscape-design/components/container";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import Link from "@cloudscape-design/components/link";
import SpaceBetween from "@cloudscape-design/components/space-between";
import StatusIndicator from "@cloudscape-design/components/status-indicator";

const RESULT_LABELS: Record<string, string> = {
  WIN: "勝ち",
  LOSS: "負け",
  DRAW: "引き分け",
};

const RESULT_TYPE: Record<
  string,
  "success" | "error" | "warning" | "info" | "stopped" | "pending"
> = {
  WIN: "success",
  LOSS: "error",
  DRAW: "warning",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const teamId = process.env.NEXT_PUBLIC_DEFAULT_TEAM_ID;

  // チームが存在するか確認する
  const { count: teamCount } = await supabase
    .from("teams")
    .select("id", { count: "exact", head: true });

  const hasTeams = (teamCount ?? 0) > 0;

  if (!hasTeams) {
    return (
      <ContentLayout
        header={
          <Header variant="h1" description="チームをセットアップしましょう">
            はじめに
          </Header>
        }
      >
        <OnboardingGuard />
      </ContentLayout>
    );
  }

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

  const today = new Date().toISOString().split("T")[0];

  // Next upcoming game (confirmed or collecting, with a future date)
  const nextGame =
    calendarGames?.find(
      (g) =>
        g.game_date &&
        g.game_date >= today &&
        ["COLLECTING", "CONFIRMED"].includes(g.status),
    ) ?? null;

  // Get full details of next game if it exists
  const nextGameFull = nextGame
    ? (games?.find((g) => g.id === nextGame.id) ?? null)
    : null;

  // Recent completed games (last 3)
  const recentCompleted =
    games
      ?.filter((g) => ["COMPLETED", "SETTLED"].includes(g.status))
      .slice(0, 3) ?? [];

  const active =
    games?.filter(
      (g) =>
        !["CONFIRMED", "COMPLETED", "SETTLED", "CANCELLED"].includes(g.status),
    ) ?? [];
  const confirmed = games?.filter((g) => g.status === "CONFIRMED") ?? [];

  return (
    <ContentLayout
      breadcrumbs={
        <BreadcrumbGroup
          items={[{ text: "ダッシュボード", href: "/dashboard" }]}
        />
      }
      header={
        <Header variant="h1" description="試合成立エンジン -- 現在の状況">
          ダッシュボード
        </Header>
      }
    >
      <SpaceBetween size="l">
        <ColumnLayout columns={3}>
          <KpiCard label="進行中" value={active.length} />
          <KpiCard label="確定済み" value={confirmed.length} />
          <KpiCard label="全試合" value={games?.length ?? 0} />
        </ColumnLayout>

        {nextGameFull && (
          <Container
            header={
              <Header
                variant="h2"
                actions={
                  <Link href={`/games/${nextGameFull.id}`}>詳細を見る</Link>
                }
              >
                次の試合
              </Header>
            }
          >
            <ColumnLayout columns={4} variant="text-grid">
              <div>
                <Box variant="awsui-key-label">タイトル</Box>
                <Link href={`/games/${nextGameFull.id}`}>
                  {nextGameFull.title}
                </Link>
              </div>
              <div>
                <Box variant="awsui-key-label">試合日</Box>
                <Box>{nextGameFull.game_date ?? "未定"}</Box>
              </div>
              <div>
                <Box variant="awsui-key-label">グラウンド</Box>
                <Box>{nextGameFull.ground_name ?? "未定"}</Box>
              </div>
              <div>
                <Box variant="awsui-key-label">出欠状況</Box>
                <Box>
                  <StatusIndicator
                    type={
                      nextGameFull.available_count >= nextGameFull.min_players
                        ? "success"
                        : "warning"
                    }
                  >
                    {nextGameFull.available_count}/{nextGameFull.min_players}人
                    参加
                  </StatusIndicator>
                </Box>
              </div>
            </ColumnLayout>
          </Container>
        )}

        {recentCompleted.length > 0 && (
          <Container header={<Header variant="h2">最近の試合結果</Header>}>
            <ColumnLayout columns={3}>
              {recentCompleted.map((g) => (
                <div key={g.id}>
                  <Box variant="awsui-key-label">
                    <Link href={`/games/${g.id}`}>{g.title}</Link>
                  </Box>
                  <Box>{g.game_date ?? "日付なし"}</Box>
                  {g.result ? (
                    <StatusIndicator type={RESULT_TYPE[g.result] ?? "info"}>
                      {RESULT_LABELS[g.result] ?? g.result}
                    </StatusIndicator>
                  ) : (
                    <Box color="text-status-inactive">結果未入力</Box>
                  )}
                </div>
              ))}
            </ColumnLayout>
          </Container>
        )}

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
      </SpaceBetween>
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
