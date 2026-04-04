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
    title: "助っ人・対戦の連絡、覚えなくていい",
    desc: "AIが連絡文を下書き、あなたが確認して送信。相手はLINEやメールで受け取るから新しいツール不要。返信追跡・履歴も全てシステムが管理。素早い応答で相手からの信頼も上がります。",
  },
  {
    title: "集金のストレスをゼロに",
    desc: "参加費を自動計算してPayPayリンクを送信。「誰が払った？」を管理画面で一目瞭然。",
  },
] as const;

const STEPS = [
  {
    title: "1. 代表が登録（5分）",
    desc: "LINEグループを連携するだけ。メンバー一覧が自動で作成されます。メンバーへの説明は不要です。",
  },
  {
    title: "2. メンバーは何もしなくていい",
    desc: "出欠の連絡はいつも通りLINEに届きます。タップで回答。アプリのインストールもアカウント作成も不要。",
  },
  {
    title: "3. あとは全部自動",
    desc: "リマインド送信・人数集計・助っ人連絡・精算計算まで。代表が確定ボタンを押すだけ。",
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
              全員が野球に集中できる環境をつくる。
            </Header>
            <Box variant="p" fontSize="heading-m" color="text-body-secondary">
              出欠の催促、助っ人探し、精算の計算——チーム運営の負担は代表に偏りがちです。mound
              はその作業を自動化し、代表もメンバーも野球だけに集中できる環境をつくります。
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
        {/* こんな悩み、ありませんか？ */}
        <Container
          header={
            <Header
              variant="h2"
              description="ボランティアベースの運営。代表に負担が偏り、疲れてしまうことも。"
            >
              チーム運営、こんなことに時間を取られていませんか？
            </Header>
          }
        >
          <ColumnLayout columns={1}>
            <Box variant="p">
              グラウンドは確保できた。でもメンバーの出欠がわからない。催促しても返事が返ってこない。
            </Box>
            <Box variant="p">
              相手チームからお誘いが来た。でも人数が揃うかわからず、すぐに返事ができない。返事が遅れて相手に迷惑をかけてしまう。
            </Box>
            <Box variant="p">
              人数が足りない。助っ人に連絡したいけど、誰に頼んだか・返事をもらったか覚えていない。
            </Box>
            <Box variant="p">
              試合が終わった。グラウンド代・審判代・ボール代を誰がいくら払うか、会計係を置くか代表が自ら手計算で管理している。
            </Box>
            <Box variant="p">
              対戦相手との連絡が個人のLINEやメールに埋もれて、チームとして管理できていない。
            </Box>
            <Box variant="p">
              新しいツールを導入したいけど、チーム全員に浸透させるのが大変。趣味の草野球のために時間をかけて覚えたくない。
            </Box>
          </ColumnLayout>
        </Container>

        {/* 選ばれる理由 */}
        <Container
          header={
            <Header
              variant="h2"
              description="LINEグループ・メール・スプレッドシートで運営している全てのチームへ"
            >
              mound が選ばれる理由
            </Header>
          }
        >
          <ColumnLayout columns={2}>
            <SpaceBetween size="xs">
              <Box variant="h3">メンバーの学習コスト：ゼロ</Box>
              <Box variant="p" color="text-body-secondary">
                メンバーはLINEで届いた通知をタップするだけ。新しいアプリのインストールもアカウント登録も不要。導入したその日から使えます。
              </Box>
            </SpaceBetween>
            <SpaceBetween size="xs">
              <Box variant="h3">代表の作業：10分の1</Box>
              <Box variant="p" color="text-body-secondary">
                出欠の催促、人数の集計、助っ人への連絡、精算の計算。今まで代表が手作業でやっていたこと全てをシステムが代行します。
              </Box>
            </SpaceBetween>
            <SpaceBetween size="xs">
              <Box variant="h3">既存アプリにない「運営の自動化」</Box>
              <Box variant="p" color="text-body-secondary">
                成績管理だけのアプリとは違います。お金の精算、対戦チームとの交渉、助っ人の声掛けまで。人手を介さずにチーム運営が回ります。
              </Box>
            </SpaceBetween>
            <SpaceBetween size="xs">
              <Box variant="h3">相手チームからの信頼UP</Box>
              <Box variant="p" color="text-body-secondary">
                AIが連絡文を下書きし、返信を自動追跡。素早く丁寧な対応で「また試合したい」と思われるチームになれます。
              </Box>
            </SpaceBetween>
          </ColumnLayout>
        </Container>

        {/* 主な機能 */}
        <Container
          header={
            <Header
              variant="h2"
              description="代表の負担を減らし、チーム全員がストレスなく使える"
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
              description="導入5分。メンバーの学習コストゼロ"
            >
              導入の流れ
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
