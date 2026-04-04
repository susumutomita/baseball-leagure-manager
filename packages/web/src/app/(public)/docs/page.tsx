import type { Metadata } from "next";
import Link from "next/link";
import styles from "./docs.module.css";

export const metadata: Metadata = {
  title: "開発者ドキュメント | mound",
  description:
    "mound の開発者向けドキュメント。アーキテクチャ、データモデル、API リファレンス、AI エージェント連携について。",
};

export default function DocsPage() {
  return (
    <>
      <h1 className={styles.pageTitle}>開発者ドキュメント</h1>
      <p className={styles.pageDescription}>
        mound は草野球チーム向けの試合成立エンジン SaaS
        です。このドキュメントでは、システムの技術的な構成と開発に必要な情報を提供します。
      </p>

      {/* Quick links */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>ドキュメント</h2>
        <div className={styles.grid}>
          <Link href="/docs/api" className={styles.linkCard}>
            <div className={styles.linkCardTitle}>API リファレンス</div>
            <p className={styles.linkCardDesc}>
              REST API
              エンドポイントの一覧、リクエスト・レスポンス仕様、認証方法について。
            </p>
          </Link>
          <Link href="/docs/ai" className={styles.linkCard}>
            <div className={styles.linkCardTitle}>AI エージェント</div>
            <p className={styles.linkCardDesc}>
              MCP サーバー連携、AI
              機能（出欠予測・助っ人推薦・メッセージ生成）の解説。
            </p>
          </Link>
        </div>
      </div>

      {/* Architecture */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>アーキテクチャ</h2>
        <p className={styles.paragraph}>
          mound
          は「試合を組む」という業務ループをシステム化したものです。代表は試合を作成するだけで、出欠通知、段階的リマインド、人数判定、助っ人打診、精算計算までシステムが自動で回します。
        </p>
        <div className={styles.info}>
          <strong>設計原則:</strong> AI は提案する (Planner) /
          システムは状態を持つ (State Machine) / ルールエンジンが暴走を防ぐ
          (Governor) / 人が最後に承認する
        </div>

        <h3 className={styles.subsectionTitle}>状態遷移</h3>
        <p className={styles.paragraph}>
          試合は以下のステータスを順に遷移します。CONFIRMED
          への遷移はガバナー条件を満たす必要があります。
        </p>
        <div className={styles.statusFlow}>
          <span className={styles.statusNode}>DRAFT</span>
          <span className={styles.statusArrow}>&rarr;</span>
          <span className={styles.statusNode}>COLLECTING</span>
          <span className={styles.statusArrow}>&rarr;</span>
          <span className={styles.statusNode}>CONFIRMED</span>
          <span className={styles.statusArrow}>&rarr;</span>
          <span className={styles.statusNode}>COMPLETED</span>
          <span className={styles.statusArrow}>&rarr;</span>
          <span className={styles.statusNode}>SETTLED</span>
        </div>
        <p className={styles.paragraph}>
          どの段階からも <code className={styles.codeInline}>CANCELLED</code>{" "}
          への遷移が可能です（COMPLETED / SETTLED を除く）。
        </p>

        <h3 className={styles.subsectionTitle}>システム構成</h3>
        <div className={styles.codeBlock}>
          {`packages/
  core/         # ドメインロジック (state-machine, governor, ai-service)
  web/          # Next.js App Router (API Routes + フロントエンド)
  mcp/          # MCP サーバー (Claude Desktop 連携)

代表 → Claude Code / Web UI → API Routes → Core ロジック → Supabase DB
                                  ↕
                            MCP Server → Claude Desktop / Cursor`}
        </div>
      </div>

      {/* Data model */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>データモデル</h2>
        <p className={styles.paragraph}>
          主要なテーブルとリレーションの概要です。
        </p>
        <div className={styles.codeBlock}>
          {`teams
  ├──< members          チーム → メンバー
  ├──< helpers           チーム → 助っ人候補
  ├──< opponent_teams    チーム → 対戦相手
  ├──< grounds           チーム → グラウンド
  └──< games             チーム → 試合

games
  ├──< rsvps             試合 → 出欠回答
  ├──< helper_requests   試合 → 助っ人打診
  ├──< negotiations      試合 → 対戦交渉
  ├──< expenses          試合 → 費用
  └──  settlements       試合 → 精算サマリー`}
        </div>

        <h3 className={styles.subsectionTitle}>主要テーブル</h3>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>テーブル</th>
              <th>説明</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code className={styles.codeInline}>teams</code>
              </td>
              <td>チーム情報。代表が管理し、設定情報を保持</td>
            </tr>
            <tr>
              <td>
                <code className={styles.codeInline}>members</code>
              </td>
              <td>チームの正規メンバー。出席率・ドタキャン率を自動計算</td>
            </tr>
            <tr>
              <td>
                <code className={styles.codeInline}>games</code>
              </td>
              <td>試合/練習イベント。状態遷移エンジンで管理</td>
            </tr>
            <tr>
              <td>
                <code className={styles.codeInline}>rsvps</code>
              </td>
              <td>出欠回答。メンバーごとに AVAILABLE / UNAVAILABLE / MAYBE</td>
            </tr>
            <tr>
              <td>
                <code className={styles.codeInline}>helpers</code>
              </td>
              <td>助っ人候補。信頼度スコア付き</td>
            </tr>
            <tr>
              <td>
                <code className={styles.codeInline}>helper_requests</code>
              </td>
              <td>助っ人への打診。充足時に未回答分を自動キャンセル</td>
            </tr>
            <tr>
              <td>
                <code className={styles.codeInline}>negotiations</code>
              </td>
              <td>対戦交渉。提案日 → 回答 → 承諾/辞退の追跡</td>
            </tr>
            <tr>
              <td>
                <code className={styles.codeInline}>expenses</code> /{" "}
                <code className={styles.codeInline}>settlements</code>
              </td>
              <td>費用記録と精算計算。PayPay 連携による送金</td>
            </tr>
            <tr>
              <td>
                <code className={styles.codeInline}>grounds</code> /{" "}
                <code className={styles.codeInline}>ground_slots</code>
              </td>
              <td>グラウンド情報と空き状況の監視</td>
            </tr>
            <tr>
              <td>
                <code className={styles.codeInline}>at_bats</code> /{" "}
                <code className={styles.codeInline}>pitching_stats</code>
              </td>
              <td>個人打撃・投手成績の記録と自動集計</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Tech stack */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>技術スタック</h2>
        <div className={styles.techStack}>
          <div className={styles.techItem}>
            <div>
              <div className={styles.techLabel}>フレームワーク</div>
              <div className={styles.techValue}>Next.js (App Router)</div>
            </div>
          </div>
          <div className={styles.techItem}>
            <div>
              <div className={styles.techLabel}>言語</div>
              <div className={styles.techValue}>TypeScript (strict)</div>
            </div>
          </div>
          <div className={styles.techItem}>
            <div>
              <div className={styles.techLabel}>データベース</div>
              <div className={styles.techValue}>Supabase (PostgreSQL)</div>
            </div>
          </div>
          <div className={styles.techItem}>
            <div>
              <div className={styles.techLabel}>認証</div>
              <div className={styles.techValue}>Supabase Auth</div>
            </div>
          </div>
          <div className={styles.techItem}>
            <div>
              <div className={styles.techLabel}>ランタイム</div>
              <div className={styles.techValue}>Bun</div>
            </div>
          </div>
          <div className={styles.techItem}>
            <div>
              <div className={styles.techLabel}>UI</div>
              <div className={styles.techValue}>Cloudscape Design System</div>
            </div>
          </div>
          <div className={styles.techItem}>
            <div>
              <div className={styles.techLabel}>バリデーション</div>
              <div className={styles.techValue}>Zod</div>
            </div>
          </div>
          <div className={styles.techItem}>
            <div>
              <div className={styles.techLabel}>デプロイ</div>
              <div className={styles.techValue}>Vercel + Supabase</div>
            </div>
          </div>
        </div>
      </div>

      {/* Getting started */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>開発環境のセットアップ</h2>

        <h3 className={styles.subsectionTitle}>前提条件</h3>
        <ul className={styles.list}>
          <li>Bun (v1.0 以上)</li>
          <li>Node.js (v18 以上)</li>
          <li>Supabase CLI (ローカル開発用)</li>
        </ul>

        <h3 className={styles.subsectionTitle}>セットアップ手順</h3>
        <div className={styles.codeBlock}>
          {`# リポジトリをクローン
git clone https://github.com/your-org/mound.git
cd mound

# 依存関係のインストール
bun install

# 環境変数を設定
cp .env.example .env.local

# 開発サーバーを起動
make start

# lint + 型チェック + テスト
make check`}
        </div>

        <h3 className={styles.subsectionTitle}>環境変数</h3>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>変数名</th>
              <th>説明</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code className={styles.codeInline}>
                  NEXT_PUBLIC_SUPABASE_URL
                </code>
              </td>
              <td>Supabase プロジェクト URL</td>
            </tr>
            <tr>
              <td>
                <code className={styles.codeInline}>
                  NEXT_PUBLIC_SUPABASE_ANON_KEY
                </code>
              </td>
              <td>Supabase 匿名キー</td>
            </tr>
            <tr>
              <td>
                <code className={styles.codeInline}>
                  SUPABASE_SERVICE_ROLE_KEY
                </code>
              </td>
              <td>Supabase サービスロールキー (サーバーサイド用)</td>
            </tr>
            <tr>
              <td>
                <code className={styles.codeInline}>NEXT_PUBLIC_LIFF_ID</code>
              </td>
              <td>LINE LIFF アプリケーション ID</td>
            </tr>
            <tr>
              <td>
                <code className={styles.codeInline}>
                  LINE_CHANNEL_ACCESS_TOKEN
                </code>
              </td>
              <td>LINE Messaging API アクセストークン</td>
            </tr>
            <tr>
              <td>
                <code className={styles.codeInline}>CRON_SECRET</code>
              </td>
              <td>Cron エンドポイントの認証シークレット</td>
            </tr>
          </tbody>
        </table>

        <h3 className={styles.subsectionTitle}>利用可能なコマンド</h3>
        <div className={styles.codeBlock}>
          {`make check          # lint + 型チェック + テスト (変更後に必ず実行)
make lint-fix       # lint の自動修正
make test           # テスト実行
make start          # 開発サーバー起動
make help           # 全コマンド一覧`}
        </div>
      </div>

      {/* Core modules */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>コアモジュール</h2>
        <p className={styles.paragraph}>
          ビジネスロジックは{" "}
          <code className={styles.codeInline}>packages/core/src/lib/</code>{" "}
          に集約されています。
        </p>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>モジュール</th>
              <th>説明</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <code className={styles.codeInline}>state-machine.ts</code>
              </td>
              <td>
                試合・交渉・助っ人打診のステートマシン。許可される遷移を定義
              </td>
            </tr>
            <tr>
              <td>
                <code className={styles.codeInline}>governor.ts</code>
              </td>
              <td>
                成立条件の判定エンジン。CONFIRMED 遷移時のガード条件をチェック
              </td>
            </tr>
            <tr>
              <td>
                <code className={styles.codeInline}>ai-service.ts</code>
              </td>
              <td>
                AI 機能 (出欠予測、助っ人推薦、メッセージ生成、週次レポート)
              </td>
            </tr>
            <tr>
              <td>
                <code className={styles.codeInline}>negotiation-policy.ts</code>
              </td>
              <td>対戦交渉ポリシーの評価。自動承諾/辞退の判定</td>
            </tr>
            <tr>
              <td>
                <code className={styles.codeInline}>
                  notification-dispatcher.ts
                </code>
              </td>
              <td>通知配信。LINE Push / メール / プッシュ通知のチャネル制御</td>
            </tr>
            <tr>
              <td>
                <code className={styles.codeInline}>stats.ts</code>
              </td>
              <td>個人成績の計算。打率・防御率・OPS 等の自動集計</td>
            </tr>
            <tr>
              <td>
                <code className={styles.codeInline}>paypay.ts</code>
              </td>
              <td>PayPay 連携。精算時の送金リンク生成</td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
