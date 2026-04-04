"use client";

import Box from "@cloudscape-design/components/box";
import ColumnLayout from "@cloudscape-design/components/column-layout";
import Container from "@cloudscape-design/components/container";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import Link from "@cloudscape-design/components/link";
import SpaceBetween from "@cloudscape-design/components/space-between";
import Table from "@cloudscape-design/components/table";

export default function DocsPage() {
  return (
    <ContentLayout
      defaultPadding
      header={
        <Header
          variant="h1"
          description="mound は草野球チーム向けの試合成立エンジン SaaS です。このドキュメントでは、システムの技術的な構成と開発に必要な情報を提供します。"
        >
          開発者ドキュメント
        </Header>
      }
    >
      <SpaceBetween size="l">
        <Container header={<Header variant="h2">ドキュメント</Header>}>
          <ColumnLayout columns={2}>
            <Container>
              <SpaceBetween size="xs">
                <Box variant="h3">
                  <Link href="/docs/api">API リファレンス</Link>
                </Box>
                <Box variant="p" color="text-body-secondary">
                  REST API
                  エンドポイントの一覧、リクエスト・レスポンス仕様、認証方法について。
                </Box>
              </SpaceBetween>
            </Container>
            <Container>
              <SpaceBetween size="xs">
                <Box variant="h3">
                  <Link href="/docs/ai">AI エージェント</Link>
                </Box>
                <Box variant="p" color="text-body-secondary">
                  MCP サーバー連携、AI
                  機能（出欠予測・助っ人推薦・メッセージ生成）の解説。
                </Box>
              </SpaceBetween>
            </Container>
          </ColumnLayout>
        </Container>

        <Container header={<Header variant="h2">アーキテクチャ</Header>}>
          <SpaceBetween size="m">
            <Box variant="p">
              mound
              は「試合を組む」という業務ループをシステム化したものです。代表は試合を作成するだけで、出欠通知、段階的リマインド、人数判定、助っ人打診、精算計算までシステムが自動で回します。
            </Box>
            <Box variant="p">
              <strong>設計原則:</strong> AI は提案する (Planner) /
              システムは状態を持つ (State Machine) / ルールエンジンが暴走を防ぐ
              (Governor) / 人が最後に承認する
            </Box>
            <Box variant="h3">状態遷移</Box>
            <Box variant="code">
              DRAFT → COLLECTING → CONFIRMED → COMPLETED → SETTLED
            </Box>
            <Box variant="p" color="text-body-secondary">
              どの段階からも CANCELLED への遷移が可能です（COMPLETED / SETTLED
              を除く）。
            </Box>
          </SpaceBetween>
        </Container>

        <Container header={<Header variant="h2">主要テーブル</Header>}>
          <Table
            columnDefinitions={[
              {
                id: "table",
                header: "テーブル",
                cell: (item) => <Box variant="code">{item.table}</Box>,
              },
              { id: "desc", header: "説明", cell: (item) => item.desc },
            ]}
            items={[
              {
                table: "teams",
                desc: "チーム情報。代表が管理し、設定情報を保持",
              },
              {
                table: "members",
                desc: "チームの正規メンバー。出席率・ドタキャン率を自動計算",
              },
              {
                table: "games",
                desc: "試合/練習イベント。状態遷移エンジンで管理",
              },
              {
                table: "rsvps",
                desc: "出欠回答。メンバーごとに AVAILABLE / UNAVAILABLE / MAYBE",
              },
              { table: "helpers", desc: "助っ人候補。信頼度スコア付き" },
              {
                table: "helper_requests",
                desc: "助っ人への打診。充足時に未回答分を自動キャンセル",
              },
              {
                table: "negotiations",
                desc: "対戦交渉。提案日 → 回答 → 承諾/辞退の追跡",
              },
              {
                table: "expenses / settlements",
                desc: "費用記録と精算計算。PayPay 連携による送金",
              },
              {
                table: "grounds / ground_slots",
                desc: "グラウンド情報と空き状況の監視",
              },
            ]}
            variant="embedded"
          />
        </Container>

        <Container header={<Header variant="h2">技術スタック</Header>}>
          <ColumnLayout columns={4}>
            {[
              ["フレームワーク", "Next.js (App Router)"],
              ["言語", "TypeScript (strict)"],
              ["データベース", "Supabase (PostgreSQL)"],
              ["認証", "LINE Login OAuth2"],
              ["ランタイム", "Bun"],
              ["UI", "Cloudscape Design System"],
              ["バリデーション", "Zod"],
              ["デプロイ", "Vercel + Supabase"],
            ].map(([label, value]) => (
              <SpaceBetween key={label} size="xxxs">
                <Box color="text-body-secondary" fontSize="body-s">
                  {label}
                </Box>
                <Box variant="p" fontWeight="bold">
                  {value}
                </Box>
              </SpaceBetween>
            ))}
          </ColumnLayout>
        </Container>

        <Container
          header={<Header variant="h2">開発環境のセットアップ</Header>}
        >
          <SpaceBetween size="m">
            <Box variant="code">
              {`git clone https://github.com/your-org/mound.git
cd mound
bun install
cp .env.example .env.local
make start`}
            </Box>
            <Box variant="code">
              {`make check          # lint + 型チェック + テスト
make lint-fix       # lint の自動修正
make start          # 開発サーバー起動
make help           # 全コマンド一覧`}
            </Box>
          </SpaceBetween>
        </Container>

        <Container header={<Header variant="h2">コアモジュール</Header>}>
          <Table
            columnDefinitions={[
              {
                id: "module",
                header: "モジュール",
                cell: (item) => <Box variant="code">{item.module}</Box>,
              },
              { id: "desc", header: "説明", cell: (item) => item.desc },
            ]}
            items={[
              {
                module: "state-machine.ts",
                desc: "試合・交渉・助っ人打診のステートマシン",
              },
              {
                module: "governor.ts",
                desc: "成立条件の判定エンジン。CONFIRMED 遷移時のガード条件",
              },
              {
                module: "ai-service.ts",
                desc: "AI 機能 (出欠予測、助っ人推薦、メッセージ生成)",
              },
              {
                module: "negotiation-policy.ts",
                desc: "対戦交渉ポリシーの評価。自動承諾/辞退",
              },
              {
                module: "notification-dispatcher.ts",
                desc: "通知配信。LINE / メール / プッシュ通知",
              },
              { module: "stats.ts", desc: "個人成績の計算。打率・防御率・OPS" },
              {
                module: "paypay.ts",
                desc: "PayPay 連携。精算時の送金リンク生成",
              },
            ]}
            variant="embedded"
          />
        </Container>
      </SpaceBetween>
    </ContentLayout>
  );
}
