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
import { calculateBattingStats } from "@match-engine/core";

const TIER_LABELS: Record<string, string> = {
  PRO: "プロ",
  LITE: "ライト",
};

const TIER_TYPE: Record<
  string,
  "success" | "info" | "warning" | "error" | "stopped" | "pending"
> = {
  PRO: "success",
  LITE: "info",
};

const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "管理者(代表)",
  ADMIN: "管理者",
  MEMBER: "メンバー",
};

const RESULT_LABELS: Record<string, string> = {
  WIN: "勝ち",
  LOSE: "負け",
  DRAW: "引き分け",
};

const RESULT_TYPE: Record<
  string,
  "success" | "error" | "info" | "warning" | "stopped" | "pending"
> = {
  WIN: "success",
  LOSE: "error",
  DRAW: "info",
};

const ATTENDANCE_STATUS_LABELS: Record<string, string> = {
  ATTENDED: "出席",
  NO_SHOW: "無断欠席",
  CANCELLED_SAME_DAY: "当日キャンセル",
};

const ATTENDANCE_STATUS_TYPE: Record<
  string,
  "success" | "error" | "warning" | "info" | "stopped" | "pending"
> = {
  ATTENDED: "success",
  NO_SHOW: "error",
  CANCELLED_SAME_DAY: "warning",
};

export default async function MemberProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // メンバー情報取得
  const { data: member } = await supabase
    .from("members")
    .select("*, teams(id, name)")
    .eq("id", id)
    .single();

  if (!member) {
    return (
      <ContentLayout header={<Header variant="h1">メンバー詳細</Header>}>
        <Box textAlign="center" color="text-status-inactive" padding="xxl">
          メンバーが見つかりません
        </Box>
      </ContentLayout>
    );
  }

  const teamId = member.team_id;
  const teamName =
    (member.teams as unknown as { id: string; name: string } | null)?.name ??
    "チーム";

  // 打撃成績
  const { data: atBats } = await supabase
    .from("at_bats")
    .select("result, rbi, runs_scored, stolen_base")
    .eq("member_id", id);

  // 出席記録
  const { data: attendances } = await supabase
    .from("attendances")
    .select("id, game_id, status, recorded_at, games(title, game_date)")
    .eq("person_id", id)
    .order("recorded_at", { ascending: false });

  const attendedCount =
    attendances?.filter((a) => a.status === "ATTENDED").length ?? 0;

  const battingStats = calculateBattingStats(atBats ?? [], attendedCount);

  // 最近の試合結果 (最大5件)
  const { data: recentGames } = await supabase
    .from("attendances")
    .select(
      "game_id, status, games!inner(title, game_date, game_results(result, our_score, opponent_score))",
    )
    .eq("person_id", id)
    .eq("status", "ATTENDED")
    .order("recorded_at", { ascending: false })
    .limit(5);

  const positions = (member.positions_json as string[]) ?? [];

  return (
    <ContentLayout
      breadcrumbs={
        <BreadcrumbGroup
          items={[
            { text: "ダッシュボード", href: "/dashboard" },
            { text: teamName, href: `/teams/${teamId}` },
            { text: member.name, href: `/members/${id}` },
          ]}
        />
      }
      header={
        <Header
          variant="h1"
          description={`${teamName} - ${ROLE_LABELS[member.role] ?? member.role}`}
          actions={
            <Link href={`/teams/${teamId}/stats`}>チーム成績に戻る</Link>
          }
        >
          {member.name}
        </Header>
      }
    >
      <SpaceBetween size="l">
        {/* メンバー情報 */}
        <Container header={<Header variant="h2">プロフィール</Header>}>
          <ColumnLayout columns={3} variant="text-grid">
            <KeyValuePairs
              items={[
                {
                  label: "背番号",
                  value:
                    member.jersey_number != null
                      ? `#${member.jersey_number}`
                      : "未設定",
                },
                {
                  label: "ポジション",
                  value: positions.length > 0 ? positions.join(", ") : "未設定",
                },
              ]}
            />
            <KeyValuePairs
              items={[
                {
                  label: "区分",
                  value: (
                    <StatusIndicator type={TIER_TYPE[member.tier] ?? "pending"}>
                      {TIER_LABELS[member.tier] ?? member.tier}
                    </StatusIndicator>
                  ),
                },
                {
                  label: "出席率",
                  value: (
                    <StatusIndicator
                      type={
                        member.attendance_rate >= 70
                          ? "success"
                          : member.attendance_rate >= 40
                            ? "warning"
                            : "error"
                      }
                    >
                      {member.attendance_rate}%
                    </StatusIndicator>
                  ),
                },
              ]}
            />
            <KeyValuePairs
              items={[
                {
                  label: "出席試合数",
                  value: `${attendedCount}`,
                },
                {
                  label: "入団日",
                  value: member.joined_at
                    ? new Date(member.joined_at).toLocaleDateString("ja-JP")
                    : "不明",
                },
              ]}
            />
          </ColumnLayout>
        </Container>

        {/* 打撃成績 */}
        <Container header={<Header variant="h2">打撃成績</Header>}>
          {battingStats.plateAppearances === 0 ? (
            <Box textAlign="center" color="text-body-secondary" padding="xxl">
              打席データがまだありません
            </Box>
          ) : (
            <ColumnLayout columns={4}>
              <KeyValuePairs
                items={[
                  {
                    label: "打率 (AVG)",
                    value: (
                      <Box fontSize="heading-m" fontWeight="bold">
                        {battingStats.avg.toFixed(3)}
                      </Box>
                    ),
                  },
                  {
                    label: "出塁率 (OBP)",
                    value: battingStats.obp.toFixed(3),
                  },
                ]}
              />
              <KeyValuePairs
                items={[
                  {
                    label: "長打率 (SLG)",
                    value: battingStats.slg.toFixed(3),
                  },
                  {
                    label: "OPS",
                    value: (
                      <StatusIndicator
                        type={
                          battingStats.ops >= 0.8
                            ? "success"
                            : battingStats.ops >= 0.6
                              ? "info"
                              : "pending"
                        }
                      >
                        {battingStats.ops.toFixed(3)}
                      </StatusIndicator>
                    ),
                  },
                ]}
              />
              <KeyValuePairs
                items={[
                  {
                    label: "安打",
                    value: `${battingStats.hits}`,
                  },
                  {
                    label: "本塁打",
                    value: `${battingStats.homeRuns}`,
                  },
                ]}
              />
              <KeyValuePairs
                items={[
                  {
                    label: "打点",
                    value: `${battingStats.rbi}`,
                  },
                  {
                    label: "盗塁",
                    value: `${battingStats.stolenBases}`,
                  },
                ]}
              />
            </ColumnLayout>
          )}
        </Container>

        {/* 最近の試合 */}
        <Table
          header={<Header variant="h2">最近の試合</Header>}
          columnDefinitions={[
            {
              id: "date",
              header: "日付",
              cell: (item) => {
                const game = item.games as unknown as {
                  title: string;
                  game_date: string | null;
                  game_results: Array<{
                    result: string | null;
                    our_score: number | null;
                    opponent_score: number | null;
                  }>;
                };
                return game.game_date
                  ? new Date(game.game_date).toLocaleDateString("ja-JP")
                  : "—";
              },
            },
            {
              id: "title",
              header: "試合",
              cell: (item) => {
                const game = item.games as unknown as {
                  title: string;
                  game_date: string | null;
                  game_results: Array<{
                    result: string | null;
                    our_score: number | null;
                    opponent_score: number | null;
                  }>;
                };
                return (
                  <Link href={`/games/${item.game_id}`}>{game.title}</Link>
                );
              },
            },
            {
              id: "result",
              header: "結果",
              cell: (item) => {
                const game = item.games as unknown as {
                  title: string;
                  game_date: string | null;
                  game_results: Array<{
                    result: string | null;
                    our_score: number | null;
                    opponent_score: number | null;
                  }>;
                };
                const gr = game.game_results?.[0];
                if (!gr?.result) return "—";
                return (
                  <StatusIndicator type={RESULT_TYPE[gr.result] ?? "pending"}>
                    {RESULT_LABELS[gr.result] ?? gr.result}
                  </StatusIndicator>
                );
              },
            },
            {
              id: "score",
              header: "スコア",
              cell: (item) => {
                const game = item.games as unknown as {
                  title: string;
                  game_date: string | null;
                  game_results: Array<{
                    result: string | null;
                    our_score: number | null;
                    opponent_score: number | null;
                  }>;
                };
                const gr = game.game_results?.[0];
                if (gr?.our_score == null) return "—";
                return `${gr.our_score} - ${gr.opponent_score}`;
              },
            },
          ]}
          items={recentGames ?? []}
          empty={
            <Box textAlign="center" color="text-body-secondary" padding="xxl">
              試合履歴がまだありません
            </Box>
          }
          variant="embedded"
        />

        {/* 出席履歴 */}
        <Table
          header={
            <Header variant="h2" counter={`(${attendances?.length ?? 0})`}>
              出席履歴
            </Header>
          }
          columnDefinitions={[
            {
              id: "date",
              header: "日付",
              cell: (item) => {
                const game = item.games as unknown as {
                  title: string;
                  game_date: string | null;
                } | null;
                return game?.game_date
                  ? new Date(game.game_date).toLocaleDateString("ja-JP")
                  : item.recorded_at
                    ? new Date(item.recorded_at).toLocaleDateString("ja-JP")
                    : "—";
              },
            },
            {
              id: "game",
              header: "試合",
              cell: (item) => {
                const game = item.games as unknown as {
                  title: string;
                  game_date: string | null;
                } | null;
                return game?.title ? (
                  <Link href={`/games/${item.game_id}`}>{game.title}</Link>
                ) : (
                  "—"
                );
              },
            },
            {
              id: "status",
              header: "ステータス",
              cell: (item) => (
                <StatusIndicator
                  type={ATTENDANCE_STATUS_TYPE[item.status] ?? "pending"}
                >
                  {ATTENDANCE_STATUS_LABELS[item.status] ?? item.status}
                </StatusIndicator>
              ),
            },
          ]}
          items={attendances ?? []}
          empty={
            <Box textAlign="center" color="text-body-secondary" padding="xxl">
              出席記録がまだありません
            </Box>
          }
          variant="embedded"
        />
      </SpaceBetween>
    </ContentLayout>
  );
}
