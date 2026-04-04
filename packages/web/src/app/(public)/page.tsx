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
    title: "未読スルーされない出欠回収",
    desc: "LINEで個別にリマインド自動送信。金曜夜に「あと3人！」がわかる。日曜朝の「やっぱ無理」も即反映。",
  },
  {
    title: "グラウンド確保、もう抽選日を忘れない",
    desc: "横浜市・藤沢市など6自治体の空き状況を毎日チェック。空きが出たらすぐ通知。",
  },
  {
    title: "助っ人の声掛けもAIにおまかせ",
    desc: "人数不足を検知したらAIが連絡文を自動作成。助っ人とのやり取りステータスも一目瞭然。応答が早いチームとして評価も上がります。",
  },
  {
    title: "集金のストレスをゼロに",
    desc: "参加費を自動計算してPayPayリンクを送信。「誰が払った？」を管理画面で一目瞭然。",
  },
] as const;

const STEPS = [
  {
    title: "1. LINEグループと連携",
    desc: "チームのLINEグループを登録するだけ。メンバー一覧が自動で作成されます。",
  },
  {
    title: "2. 試合を立てる",
    desc: "日付と場所を入れたら、出欠回収が自動スタート。リマインドも全自動。",
  },
  {
    title: "3. 試合成立",
    desc: "人数OK・グラウンドOK・相手OK。確定ボタンひとつで全員に通知。",
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
              金曜の夜。LINEの出欠、まだ5人しか返事がない。
            </Header>
            <Box variant="p" fontSize="heading-m" color="text-body-secondary">
              「9人集まるのか」「グラウンドどうする」「相手チームは」——
              全部、mound が解決します。
            </Box>
            <Box>
              <Button variant="primary" onClick={() => router.push("/login")}>
                無料ではじめる
              </Button>
            </Box>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="xxl">
        {/* 主な機能 */}
        <Container
          header={
            <Header
              variant="h2"
              description="試合を「成立」させるために必要な機能をワンストップで"
            >
              主な機能
            </Header>
          }
        >
          <ColumnLayout columns={2}>
            {FEATURES.map((f) => (
              <Container key={f.title}>
                <SpaceBetween size="xs">
                  <Box variant="h3">{f.title}</Box>
                  <Box variant="p" color="text-body-secondary">
                    {f.desc}
                  </Box>
                </SpaceBetween>
              </Container>
            ))}
          </ColumnLayout>
        </Container>

        {/* かんたん3ステップ */}
        <Container
          header={
            <Header
              variant="h2"
              description="面倒な初期設定は不要。すぐに使い始められます"
            >
              かんたん3ステップ
            </Header>
          }
        >
          <ColumnLayout columns={3}>
            {STEPS.map((s) => (
              <SpaceBetween key={s.title} size="xs">
                <Box variant="h3">{s.title}</Box>
                <Box variant="p" color="text-body-secondary">
                  {s.desc}
                </Box>
              </SpaceBetween>
            ))}
          </ColumnLayout>
        </Container>

        {/* 料金プラン */}
        <Container
          header={
            <Header variant="h2" description="まずは無料プランでお試しください">
              料金プラン
            </Header>
          }
        >
          <ColumnLayout columns={2}>
            <Container
              header={<Header variant="h3">LITE</Header>}
              footer={
                <Button onClick={() => router.push("/login")}>
                  無料ではじめる
                </Button>
              }
            >
              <SpaceBetween size="s">
                <Box variant="h1" fontSize="display-l">
                  無料
                </Box>
                <Box variant="p" color="text-body-secondary">
                  出欠管理（1チーム） / 試合作成（月3件まで） / LINE通知 /
                  基本統計
                </Box>
              </SpaceBetween>
            </Container>

            <Container
              header={
                <Header variant="h3" info="おすすめ">
                  PRO
                </Header>
              }
              footer={
                <Button variant="primary" onClick={() => router.push("/login")}>
                  PROで始める
                </Button>
              }
            >
              <SpaceBetween size="s">
                <SpaceBetween
                  size="xxs"
                  direction="horizontal"
                  alignItems="end"
                >
                  <Box variant="h1" fontSize="display-l">
                    &yen;980
                  </Box>
                  <Box variant="p" color="text-body-secondary">
                    / 月（税込）
                  </Box>
                </SpaceBetween>
                <Box variant="p" color="text-body-secondary">
                  出欠管理（無制限） / 試合作成（無制限） / グラウンド空き監視 /
                  対戦相手マッチング / 精算・PayPay連携 / AI運営アシスタント /
                  優先サポート
                </Box>
              </SpaceBetween>
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
              &copy; 2026 mound. All rights reserved.
            </Box>
          </SpaceBetween>
        </Box>
      </SpaceBetween>
    </ContentLayout>
  );
}
