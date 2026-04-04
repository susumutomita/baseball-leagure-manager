"use client";

import Alert from "@cloudscape-design/components/alert";
import Box from "@cloudscape-design/components/box";
import BreadcrumbGroup from "@cloudscape-design/components/breadcrumb-group";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import Input from "@cloudscape-design/components/input";
import Link from "@cloudscape-design/components/link";
import SpaceBetween from "@cloudscape-design/components/space-between";
import StatusIndicator from "@cloudscape-design/components/status-indicator";
import Table from "@cloudscape-design/components/table";
import { use, useEffect, useMemo, useState } from "react";

interface UpcomingGame {
  id: string;
  title: string;
  game_date: string | null;
  start_time: string | null;
  ground_name: string | null;
  status: string;
}

const STATUS_TYPE: Record<
  string,
  "success" | "info" | "warning" | "error" | "stopped" | "pending"
> = {
  DRAFT: "pending",
  COLLECTING: "info",
  CONFIRMED: "success",
  COMPLETED: "success",
  SETTLED: "stopped",
  CANCELLED: "error",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "下書き",
  COLLECTING: "出欠収集中",
  CONFIRMED: "確定",
  COMPLETED: "完了",
  SETTLED: "精算済み",
  CANCELLED: "中止",
};

export default function CalendarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [copied, setCopied] = useState(false);
  const [upcomingGames, setUpcomingGames] = useState<UpcomingGame[]>([]);
  const [loading, setLoading] = useState(true);

  const calendarUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/api/teams/${id}/calendar`;
  }, [id]);

  const googleCalendarUrl = useMemo(() => {
    if (!calendarUrl) return "";
    // Google Calendar uses webcal:// protocol for subscriptions
    const webcalUrl = calendarUrl.replace(/^https?:\/\//, "webcal://");
    return `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`;
  }, [calendarUrl]);

  useEffect(() => {
    const fetchGames = async () => {
      try {
        const res = await fetch(`/api/teams/${id}/calendar`);
        if (!res.ok) {
          setLoading(false);
          return;
        }
        // The calendar API returns ics text, so we fetch games from the games API instead
        const gamesRes = await fetch(
          `/api/games?team_id=${id}&limit=5&upcoming=true`,
        );
        if (gamesRes.ok) {
          const data = await gamesRes.json();
          setUpcomingGames(data.data ?? []);
        }
      } catch {
        // ignore errors
      } finally {
        setLoading(false);
      }
    };
    fetchGames();
  }, [id]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(calendarUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadIcs = () => {
    // Trigger download of .ics file
    const link = document.createElement("a");
    link.href = calendarUrl;
    link.download = "games.ics";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <ContentLayout
      breadcrumbs={
        <BreadcrumbGroup
          items={[
            { text: "ダッシュボード", href: "/dashboard" },
            { text: "チーム", href: `/teams/${id}` },
            { text: "カレンダー連携", href: `/teams/${id}/calendar` },
          ]}
        />
      }
      header={<Header variant="h1">カレンダー連携</Header>}
    >
      <SpaceBetween size="l">
        <Container header={<Header variant="h2">購読 URL</Header>}>
          <SpaceBetween size="s">
            <Box variant="p">
              以下の URL
              をカレンダーアプリに登録すると、試合予定が自動的に同期されます。
            </Box>
            <SpaceBetween direction="horizontal" size="xs">
              <Box display="block" variant="code">
                <Input value={calendarUrl} readOnly />
              </Box>
              <Button onClick={handleCopy} iconName="copy">
                {copied ? "コピーしました" : "コピー"}
              </Button>
            </SpaceBetween>
          </SpaceBetween>
        </Container>

        <Container header={<Header variant="h2">エクスポート</Header>}>
          <SpaceBetween size="m">
            <SpaceBetween direction="horizontal" size="xs">
              <Button onClick={handleDownloadIcs} iconName="download">
                .ics ファイルをダウンロード
              </Button>
              <Link href={googleCalendarUrl} external>
                <Button iconName="external">Google カレンダーに追加</Button>
              </Link>
            </SpaceBetween>
            <Box variant="small" color="text-body-secondary">
              .ics ファイルはカレンダーアプリに直接インポートできます。Google
              カレンダーボタンは購読URLを自動登録します。
            </Box>
          </SpaceBetween>
        </Container>

        <Container
          header={
            <Header variant="h2" description="直近の試合予定を表示しています">
              直近の試合
            </Header>
          }
        >
          {loading ? (
            <Box textAlign="center" padding="l">
              <StatusIndicator type="loading">読み込み中...</StatusIndicator>
            </Box>
          ) : upcomingGames.length > 0 ? (
            <Table
              columnDefinitions={[
                {
                  id: "title",
                  header: "タイトル",
                  cell: (item) => (
                    <Link href={`/games/${item.id}`}>{item.title}</Link>
                  ),
                },
                {
                  id: "game_date",
                  header: "試合日",
                  cell: (item) => item.game_date ?? "未定",
                },
                {
                  id: "start_time",
                  header: "開始時刻",
                  cell: (item) => item.start_time ?? "未定",
                },
                {
                  id: "ground_name",
                  header: "グラウンド",
                  cell: (item) => item.ground_name ?? "未定",
                },
                {
                  id: "status",
                  header: "ステータス",
                  cell: (item) => (
                    <StatusIndicator type={STATUS_TYPE[item.status] ?? "info"}>
                      {STATUS_LABELS[item.status] ?? item.status}
                    </StatusIndicator>
                  ),
                },
              ]}
              items={upcomingGames}
              variant="embedded"
            />
          ) : (
            <Box textAlign="center" color="text-status-inactive" padding="l">
              直近の試合予定はありません
            </Box>
          )}
        </Container>

        <Container
          header={<Header variant="h2">カレンダーアプリへの登録方法</Header>}
        >
          <SpaceBetween size="m">
            <Alert type="info" header="Google カレンダー">
              <ol>
                <li>
                  上の「Google カレンダーに追加」ボタンをクリック、または Google
                  カレンダーを開き、左メニューの「他のカレンダー」横の
                  「+」をクリック
                </li>
                <li>「URL で追加」を選択</li>
                <li>上記の URL を貼り付けて「カレンダーを追加」をクリック</li>
              </ol>
            </Alert>

            <Alert type="info" header="Apple カレンダー (macOS / iOS)">
              <ol>
                <li>「ファイル」→「新規カレンダー照会...」を選択</li>
                <li>上記の URL を貼り付けて「照会」をクリック</li>
                <li>名前と更新頻度を設定して「OK」をクリック</li>
              </ol>
            </Alert>

            <Alert type="info" header="Outlook">
              <ol>
                <li>「カレンダーの追加」→「Web から購読」を選択</li>
                <li>上記の URL を貼り付けて「インポート」をクリック</li>
              </ol>
            </Alert>
          </SpaceBetween>
        </Container>
      </SpaceBetween>
    </ContentLayout>
  );
}
