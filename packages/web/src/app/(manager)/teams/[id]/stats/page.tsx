import { createClient } from "@/lib/supabase/server";
import Box from "@cloudscape-design/components/box";
import BreadcrumbGroup from "@cloudscape-design/components/breadcrumb-group";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Container from "@cloudscape-design/components/container";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import KeyValuePairs from "@cloudscape-design/components/key-value-pairs";
import Link from "@cloudscape-design/components/link";
import SpaceBetween from "@cloudscape-design/components/space-between";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Table from "@cloudscape-design/components/table";
import { calculateBattingStats, calculateTeamStats } from "@match-engine/core";

export default async function StatsPage({
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

  // チーム戦績
  const { data: gameResults } = await supabase
    .from("game_results")
    .select("result, our_score, opponent_score, games!inner(team_id)")
    .eq("games.team_id", id);

  const teamStats = calculateTeamStats(gameResults ?? []);

  // メンバー別打撃成績
  const { data: members } = await supabase
    .from("members")
    .select("id, name")
    .eq("team_id", id)
    .eq("status", "ACTIVE");

  const memberStats = [];
  for (const member of members ?? []) {
    const { data: atBats } = await supabase
      .from("at_bats")
      .select("result, rbi, runs_scored, stolen_base")
      .eq("member_id", member.id);

    const { data: attended } = await supabase
      .from("attendances")
      .select("id")
      .eq("person_id", member.id)
      .eq("status", "ATTENDED");

    const stats = calculateBattingStats(atBats ?? [], attended?.length ?? 0);
    memberStats.push({ member_id: member.id, name: member.name, ...stats });
  }

  memberStats.sort((a, b) => b.avg - a.avg);

  return (
    <ContentLayout
      breadcrumbs={
        <BreadcrumbGroup
          items={[
            { text: "ダッシュボード", href: "/" },
            { text: team?.name ?? "チーム", href: `/teams/${id}` },
            { text: "成績", href: `/teams/${id}/stats` },
          ]}
        />
      }
      header={
        <Header
          variant="h1"
          description={team?.name ?? ""}
          actions={<Link href={`/teams/${id}`}>チームに戻る</Link>}
        >
          成績・統計
        </Header>
      }
    >
      <SpaceBetween size="l">
        <Container header={<Header variant="h2">チーム戦績</Header>}>
          {teamStats.totalGames === 0 ? (
            <Box textAlign="center" color="text-body-secondary" padding="xxl">
              試合結果がまだありません
            </Box>
          ) : (
            <ColumnLayout columns={4}>
              <KeyValuePairs
                items={[
                  {
                    label: "勝敗",
                    value: `${teamStats.wins}勝${teamStats.losses}敗${teamStats.draws}分`,
                  },
                ]}
              />
              <KeyValuePairs
                items={[
                  {
                    label: "勝率",
                    value: (
                      <StatusIndicator
                        type={teamStats.winRate >= 0.5 ? "success" : "warning"}
                      >
                        {teamStats.winRate.toFixed(3)}
                      </StatusIndicator>
                    ),
                  },
                ]}
              />
              <KeyValuePairs
                items={[
                  {
                    label: "得失点差",
                    value: (
                      <Box
                        color={
                          teamStats.runDifferential >= 0
                            ? "text-status-success"
                            : "text-status-error"
                        }
                      >
                        {teamStats.runDifferential >= 0 ? "+" : ""}
                        {teamStats.runDifferential}
                      </Box>
                    ),
                  },
                ]}
              />
              <KeyValuePairs
                items={[{ label: "試合数", value: `${teamStats.totalGames}` }]}
              />
            </ColumnLayout>
          )}
        </Container>

        <Table
          header={
            <Header variant="h2" counter={`(${memberStats.length})`}>
              個人打撃成績
            </Header>
          }
          columnDefinitions={[
            {
              id: "name",
              header: "選手",
              cell: (item) => item.name,
              sortingField: "name",
            },
            {
              id: "games",
              header: "試合",
              cell: (item) => item.games,
            },
            {
              id: "avg",
              header: "打率",
              cell: (item) => item.avg.toFixed(3),
              sortingField: "avg",
            },
            {
              id: "pa",
              header: "打席",
              cell: (item) => item.plateAppearances,
            },
            {
              id: "hits",
              header: "安打",
              cell: (item) => item.hits,
            },
            {
              id: "hr",
              header: "本塁打",
              cell: (item) => item.homeRuns,
            },
            {
              id: "rbi",
              header: "打点",
              cell: (item) => item.rbi,
            },
            {
              id: "obp",
              header: "出塁率",
              cell: (item) => item.obp.toFixed(3),
            },
            {
              id: "slg",
              header: "長打率",
              cell: (item) => item.slg.toFixed(3),
            },
            {
              id: "ops",
              header: "OPS",
              cell: (item) => item.ops.toFixed(3),
              sortingField: "ops",
            },
            {
              id: "sb",
              header: "盗塁",
              cell: (item) => item.stolenBases,
            },
          ]}
          items={memberStats}
          empty={
            <Box textAlign="center" color="text-body-secondary" padding="xxl">
              打席データがまだありません
            </Box>
          }
          variant="full-page"
          stickyHeader
        />
      </SpaceBetween>
    </ContentLayout>
  );
}
