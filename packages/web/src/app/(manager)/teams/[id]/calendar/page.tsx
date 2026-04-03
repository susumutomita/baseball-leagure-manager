"use client";

import Alert from "@cloudscape-design/components/alert";
import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import Container from "@cloudscape-design/components/container";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import Input from "@cloudscape-design/components/input";
import Link from "@cloudscape-design/components/link";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { use, useMemo, useState } from "react";

export default function CalendarPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [copied, setCopied] = useState(false);

  const calendarUrl = useMemo(() => {
    if (typeof window === "undefined") return "";
    return `${window.location.origin}/api/teams/${id}/calendar`;
  }, [id]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(calendarUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <ContentLayout
      header={
        <Header
          variant="h1"
          actions={
            <Link href={`/teams/${id}`} variant="primary">
              チーム詳細に戻る
            </Link>
          }
        >
          カレンダー連携
        </Header>
      }
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

        <Container
          header={<Header variant="h2">カレンダーアプリへの登録方法</Header>}
        >
          <SpaceBetween size="m">
            <Alert type="info" header="Google カレンダー">
              <ol>
                <li>
                  Google カレンダーを開き、左メニューの「他のカレンダー」横の
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
