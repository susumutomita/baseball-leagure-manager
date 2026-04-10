"use client";

import { DashboardView } from "@/components/DashboardView";
import { OnboardingGuard } from "@/components/OnboardingGuard";
import { TeamSetupChecklist } from "@/components/TeamSetupChecklist";
import { useTeam } from "@/contexts/TeamContext";
import Box from "@cloudscape-design/components/box";
import BreadcrumbGroup from "@cloudscape-design/components/breadcrumb-group";
import Button from "@cloudscape-design/components/button";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Container from "@cloudscape-design/components/container";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import Link from "@cloudscape-design/components/link";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Spinner from "@cloudscape-design/components/spinner";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import { useEffect, useState } from "react";

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

interface GameRow {
  id: string;
  title: string;
  game_type: string;
  status: string;
  game_date: string | null;
  ground_name: string | null;
  min_players: number;
  available_count: number;
  unavailable_count: number;
  no_response_count: number;
  result?: string | null;
}

interface SetupSummary {
  memberCount: number;
  groundCount: number;
  opponentCount: number;
}

export default function DashboardPage() {
  const team = useTeam();
  const teamId = team?.teamId;
  const [games, setGames] = useState<GameRow[]>([]);
  const [setupSummary, setSetupSummary] = useState<SetupSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!teamId) {
      setLoading(false);
      return;
    }

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const [gamesRes, membersRes, groundsRes, opponentsRes] =
          await Promise.all([
            fetch(`/api/games?team_id=${teamId}&limit=20`),
            fetch(`/api/teams/${teamId}/members`),
            fetch(`/api/grounds?team_id=${teamId}`),
            fetch(`/api/teams/${teamId}/opponents`),
          ]);

        if (!gamesRes.ok) throw new Error("試合データの取得に失敗しました");

        const [gamesJson, membersJson, groundsJson, opponentsJson] =
          await Promise.all([
            gamesRes.json(),
            membersRes.ok ? membersRes.json() : Promise.resolve({ data: [] }),
            groundsRes.ok ? groundsRes.json() : Promise.resolve({ data: [] }),
            opponentsRes.ok
              ? opponentsRes.json()
              : Promise.resolve({ data: [] }),
          ]);

        const nextGames = gamesJson.data ?? [];
        setGames(nextGames);
        setSetupSummary({
          memberCount: membersJson.data?.length ?? 0,
          groundCount: groundsJson.data?.length ?? 0,
          opponentCount: opponentsJson.data?.length ?? 0,
        });
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "データの取得に失敗しました",
        );
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [teamId]);

  if (loading) {
    return (
      <ContentLayout
        header={
          <Header variant="h1" description="読み込み中...">
            ダッシュボード
          </Header>
        }
      >
        <Box padding="xxl" textAlign="center">
          <Spinner size="large" />
        </Box>
      </ContentLayout>
    );
  }

  if (!teamId) {
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

  if (error) {
    return (
      <ContentLayout header={<Header variant="h1">ダッシュボード</Header>}>
        <Container>
          <SpaceBetween size="l">
            <Box color="text-status-error">{error}</Box>
            <Button onClick={() => window.location.reload()}>再読み込み</Button>
          </SpaceBetween>
        </Container>
      </ContentLayout>
    );
  }

  const today = new Date().toISOString().split("T")[0];
  const nextGameFull =
    games.find(
      (g) =>
        g.game_date &&
        g.game_date >= today &&
        ["COLLECTING", "CONFIRMED"].includes(g.status),
    ) ?? null;

  const recentCompleted = games
    .filter((g) => ["COMPLETED", "SETTLED"].includes(g.status))
    .slice(0, 3);

  const active = games.filter(
    (g) =>
      !["CONFIRMED", "COMPLETED", "SETTLED", "CANCELLED"].includes(g.status),
  );
  const confirmed = games.filter((g) => g.status === "CONFIRMED");

  if (games.length === 0) {
    return (
      <ContentLayout
        breadcrumbs={
          <BreadcrumbGroup
            items={[{ text: "ダッシュボード", href: "/dashboard" }]}
          />
        }
        header={
          <Header variant="h1" description="現在の状況">
            ダッシュボード
          </Header>
        }
      >
        <Container header={<Header variant="h2">まだ活動がありません</Header>}>
          <SpaceBetween size="l">
            {setupSummary && (
              <TeamSetupChecklist
                teamId={teamId}
                memberCount={setupSummary.memberCount}
                groundCount={setupSummary.groundCount}
                opponentCount={setupSummary.opponentCount}
                gameCount={games.length}
              />
            )}
            <SpaceBetween size="m">
              <Box variant="p">
                最初の活動を作成して、チーム運営を始めましょう。
                試合・練習・イベントを作成すると、メンバーへの出欠確認が自動で始まります。
              </Box>
              <Button variant="primary" href="/games">
                活動を作成する
              </Button>
            </SpaceBetween>
          </SpaceBetween>
        </Container>
      </ContentLayout>
    );
  }

  const calendarGames = games
    .filter((g): g is GameRow & { game_date: string } => g.game_date !== null)
    .map((g) => ({
      id: g.id,
      title: g.title,
      game_date: g.game_date,
      status: g.status,
      game_type: g.game_type,
    }));

  return (
    <ContentLayout
      breadcrumbs={
        <BreadcrumbGroup
          items={[{ text: "ダッシュボード", href: "/dashboard" }]}
        />
      }
      header={
        <Header variant="h1" description="現在の状況">
          ダッシュボード
        </Header>
      }
    >
      <SpaceBetween size="l">
        {setupSummary && (
          <TeamSetupChecklist
            teamId={teamId}
            memberCount={setupSummary.memberCount}
            groundCount={setupSummary.groundCount}
            opponentCount={setupSummary.opponentCount}
            gameCount={games.length}
          />
        )}

        <ColumnLayout columns={3}>
          <KpiCard label="進行中" value={active.length} />
          <KpiCard label="確定済み" value={confirmed.length} />
          <KpiCard label="全試合" value={games.length} />
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
          games={games.map((g) => ({
            id: g.id,
            title: g.title,
            game_type: g.game_type,
            status: g.status,
            game_date: g.game_date,
            available_count: g.available_count,
            unavailable_count: g.unavailable_count,
            no_response_count: g.no_response_count,
          }))}
          calendarGames={calendarGames}
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
