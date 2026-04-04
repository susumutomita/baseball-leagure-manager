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

  // チーム打撃平均
  const teamBattingAvg =
    memberStats.length > 0
      ? memberStats.reduce((sum, s) => sum + s.avg, 0) / memberStats.length
      : 0;

  // リーダーボード (rank付き)
  const battingAvgLeaders = [...memberStats]
    .filter((s) => s.atBats >= 1)
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5)
    .map((s, i) => ({ ...s, rank: i + 1 }));
  const hrLeaders = [...memberStats]
    .filter((s) => s.homeRuns >= 1)
    .sort((a, b) => b.homeRuns - a.homeRuns)
    .slice(0, 5)
    .map((s, i) => ({ ...s, rank: i + 1 }));
  const rbiLeaders = [...memberStats]
    .filter((s) => s.rbi >= 1)
    .sort((a, b) => b.rbi - a.rbi)
    .slice(0, 5)
    .map((s, i) => ({ ...s, rank: i + 1 }));

  return (
    <ContentLayout
      breadcrumbs={
        <BreadcrumbGroup
          items={[
            { text: "ダッシュボード", href: "/dashboard" },
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
        {/* チーム戦績サマリー */}
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
                    label: "戦績 (W-L-D)",
                    value: (
                      <Box fontSize="heading-m" fontWeight="bold">
                        {teamStats.wins}-{teamStats.losses}-{teamStats.draws}
                      </Box>
                    ),
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
                    label: "チーム打率",
                    value: teamBattingAvg.toFixed(3),
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
            </ColumnLayout>
          )}
        </Container>

        {/* 個人リーダーボード */}
        {memberStats.length > 0 && (
          <ColumnLayout columns={3}>
            <Container header={<Header variant="h3">打率リーダー</Header>}>
              {battingAvgLeaders.length === 0 ? (
                <Box textAlign="center" color="text-body-secondary" padding="s">
                  データなし
                </Box>
              ) : (
                <Table
                  variant="embedded"
                  columnDefinitions={[
                    {
                      id: "rank",
                      header: "#",
                      cell: (item) => item.rank,
                      width: 50,
                    },
                    {
                      id: "name",
                      header: "選手",
                      cell: (item) => (
                        <Link
                          href={`/members/${item.member_id}`}
                          variant="secondary"
                        >
                          {item.name}
                        </Link>
                      ),
                    },
                    {
                      id: "avg",
                      header: "打率",
                      cell: (item) => (
                        <Box fontWeight="bold">{item.avg.toFixed(3)}</Box>
                      ),
                    },
                  ]}
                  items={battingAvgLeaders}
                />
              )}
            </Container>
            <Container header={<Header variant="h3">本塁打リーダー</Header>}>
              {hrLeaders.length === 0 ? (
                <Box textAlign="center" color="text-body-secondary" padding="s">
                  データなし
                </Box>
              ) : (
                <Table
                  variant="embedded"
                  columnDefinitions={[
                    {
                      id: "rank",
                      header: "#",
                      cell: (item) => item.rank,
                      width: 50,
                    },
                    {
                      id: "name",
                      header: "選手",
                      cell: (item) => (
                        <Link
                          href={`/members/${item.member_id}`}
                          variant="secondary"
                        >
                          {item.name}
                        </Link>
                      ),
                    },
                    {
                      id: "hr",
                      header: "HR",
                      cell: (item) => (
                        <Box fontWeight="bold">{item.homeRuns}</Box>
                      ),
                    },
                  ]}
                  items={hrLeaders}
                />
              )}
            </Container>
            <Container header={<Header variant="h3">打点リーダー</Header>}>
              {rbiLeaders.length === 0 ? (
                <Box textAlign="center" color="text-body-secondary" padding="s">
                  データなし
                </Box>
              ) : (
                <Table
                  variant="embedded"
                  columnDefinitions={[
                    {
                      id: "rank",
                      header: "#",
                      cell: (item) => item.rank,
                      width: 50,
                    },
                    {
                      id: "name",
                      header: "選手",
                      cell: (item) => (
                        <Link
                          href={`/members/${item.member_id}`}
                          variant="secondary"
                        >
                          {item.name}
                        </Link>
                      ),
                    },
                    {
                      id: "rbi",
                      header: "打点",
                      cell: (item) => <Box fontWeight="bold">{item.rbi}</Box>,
                    },
                  ]}
                  items={rbiLeaders}
                />
              )}
            </Container>
          </ColumnLayout>
        )}

        {/* 個人打撃成績テーブル */}
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
              cell: (item) => (
                <Link href={`/members/${item.member_id}`}>{item.name}</Link>
              ),
              sortingField: "name",
            },
            {
              id: "games",
              header: "試合",
              cell: (item) => item.games,
              sortingField: "games",
            },
            {
              id: "avg",
              header: "打率",
              cell: (item) => (
                <Box fontWeight="bold">{item.avg.toFixed(3)}</Box>
              ),
              sortingField: "avg",
            },
            {
              id: "pa",
              header: "打席",
              cell: (item) => item.plateAppearances,
              sortingField: "plateAppearances",
            },
            {
              id: "hits",
              header: "安打",
              cell: (item) => item.hits,
              sortingField: "hits",
            },
            {
              id: "hr",
              header: "本塁打",
              cell: (item) => item.homeRuns,
              sortingField: "homeRuns",
            },
            {
              id: "rbi",
              header: "打点",
              cell: (item) => item.rbi,
              sortingField: "rbi",
            },
            {
              id: "obp",
              header: "出塁率",
              cell: (item) => item.obp.toFixed(3),
              sortingField: "obp",
            },
            {
              id: "slg",
              header: "長打率",
              cell: (item) => item.slg.toFixed(3),
              sortingField: "slg",
            },
            {
              id: "ops",
              header: "OPS",
              cell: (item) => (
                <StatusIndicator
                  type={
                    item.ops >= 0.8
                      ? "success"
                      : item.ops >= 0.6
                        ? "info"
                        : "pending"
                  }
                >
                  {item.ops.toFixed(3)}
                </StatusIndicator>
              ),
              sortingField: "ops",
            },
            {
              id: "sb",
              header: "盗塁",
              cell: (item) => item.stolenBases,
              sortingField: "stolenBases",
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
          sortingDisabled={false}
        />
      </SpaceBetween>
    </ContentLayout>
  );
}
