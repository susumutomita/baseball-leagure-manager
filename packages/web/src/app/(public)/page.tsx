"use client";

import Box from "@cloudscape-design/components/box";
import Button from "@cloudscape-design/components/button";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Container from "@cloudscape-design/components/container";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import Link from "@cloudscape-design/components/link";
import SpaceBetween from "@cloudscape-design/components/space-between";
import { useRouter } from "next/navigation";

const FEATURES = [
  {
    title: "出欠はLINEでタップだけ",
    desc: "催促も集計も自動。メンバーは何もインストールしなくていい。",
  },
  {
    title: "助っ人・対戦相手もワンタッチ",
    desc: "過去の実績から最適な候補をAIが提案。連絡文も自動で下書き。",
  },
  {
    title: "精算はPayPayで一発",
    desc: "参加費を自動計算してリンクを送信。「誰が払った」も一目瞭然。",
  },
  {
    title: "グラウンドの空きを自動監視",
    desc: "空きが出たら即通知。もう抽選日を忘れない。",
  },
] as const;

export default function LandingPage() {
  const router = useRouter();

  return (
    <ContentLayout
      defaultPadding
      headerBackgroundStyle="default"
      header={
        <Box padding={{ top: "xxxl", bottom: "xxxl" }}>
          <SpaceBetween size="l">
            <Header variant="h1">
              試合の段取り、もう代表が一人で抱えなくていい。
            </Header>
            <Box variant="p" fontSize="heading-m" color="text-body-secondary">
              出欠・助っ人・精算・グラウンド確保——草野球チーム運営を丸ごと自動化。メンバーはLINEで回答するだけ。
            </Box>
            <SpaceBetween size="s" direction="horizontal">
              <Button variant="primary" onClick={() => router.push("/login")}>
                無料ではじめる
              </Button>
              <Button variant="link" onClick={() => router.push("/login")}>
                ログイン
              </Button>
            </SpaceBetween>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="xxl">
        {/* 主な機能 */}
        <Container header={<Header variant="h2">できること</Header>}>
          <ColumnLayout columns={2}>
            {FEATURES.map((f) => (
              <SpaceBetween key={f.title} size="xxs">
                <Box variant="h3">{f.title}</Box>
                <Box variant="p" color="text-body-secondary">
                  {f.desc}
                </Box>
              </SpaceBetween>
            ))}
          </ColumnLayout>
        </Container>

        {/* 導入ステップ */}
        <Container header={<Header variant="h2">始め方</Header>}>
          <ColumnLayout columns={3}>
            <SpaceBetween size="xxs">
              <Box variant="h3">1. LINE で登録（5分）</Box>
              <Box variant="p" color="text-body-secondary">
                LINEアカウントでログインするだけ。メンバーの説明は不要。
              </Box>
            </SpaceBetween>
            <SpaceBetween size="xxs">
              <Box variant="h3">2. 試合を作成</Box>
              <Box variant="p" color="text-body-secondary">
                日程とグラウンドを入れたら出欠の依頼が自動で飛ぶ。
              </Box>
            </SpaceBetween>
            <SpaceBetween size="xxs">
              <Box variant="h3">3. 確定ボタンを押す</Box>
              <Box variant="p" color="text-body-secondary">
                人数が揃ったら確定。精算まで全部システムがやる。
              </Box>
            </SpaceBetween>
          </ColumnLayout>
        </Container>

        {/* 料金 */}
        <Container header={<Header variant="h2">料金</Header>}>
          <ColumnLayout columns={3}>
            <Container
              header={<Header variant="h3">無料</Header>}
              footer={
                <Button onClick={() => router.push("/login")}>
                  無料ではじめる
                </Button>
              }
            >
              <Box variant="p" color="text-body-secondary">
                1チーム・月3試合まで
              </Box>
            </Container>

            <Container
              header={
                <Header variant="h3" info="おすすめ">
                  ¥500/月
                </Header>
              }
              footer={
                <Button variant="primary" onClick={() => router.push("/login")}>
                  STANDARDで始める
                </Button>
              }
            >
              <Box variant="p" color="text-body-secondary">
                試合無制限・グラウンド監視・精算・対戦マッチング
              </Box>
            </Container>

            <Container
              header={<Header variant="h3">¥980/月</Header>}
              footer={
                <Button onClick={() => router.push("/login")}>
                  PROで始める
                </Button>
              }
            >
              <Box variant="p" color="text-body-secondary">
                全機能＋AI運営アシスタント・優先サポート
              </Box>
            </Container>
          </ColumnLayout>
        </Container>

        {/* フッター */}
        <Box textAlign="center" padding={{ bottom: "xl" }}>
          <SpaceBetween size="xs">
            <Box color="text-body-secondary" fontSize="body-s">
              <SpaceBetween size="m" direction="horizontal">
                <Link href="/terms" fontSize="body-s">
                  利用規約
                </Link>
                <Link href="/privacy" fontSize="body-s">
                  プライバシーポリシー
                </Link>
              </SpaceBetween>
            </Box>
            <Box color="text-body-secondary" fontSize="body-s">
              &copy; 2026 mound
            </Box>
          </SpaceBetween>
        </Box>
      </SpaceBetween>
    </ContentLayout>
  );
}
