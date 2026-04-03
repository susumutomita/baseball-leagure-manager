import type { Metadata } from "next";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "プライバシーポリシー - mound",
  description: "mound のプライバシーポリシーです。",
};

export default function PrivacyPage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>プライバシーポリシー</h1>
      <p className={styles.updated}>最終更新日: 2026年4月1日</p>

      <section className={styles.section}>
        <h2>1. はじめに</h2>
        <p>
          当社は、本サービス「mound」（以下「本サービス」）における、ユーザーの個人情報の取扱いについて、以下のとおりプライバシーポリシーを定めます。
        </p>
      </section>

      <section className={styles.section}>
        <h2>2. 収集する情報</h2>
        <p>当社は、以下の情報を収集することがあります。</p>
        <ul>
          <li>LINEアカウント情報（表示名、プロフィール画像、ユーザーID）</li>
          <li>メールアドレス</li>
          <li>チーム情報（チーム名、メンバー構成）</li>
          <li>試合情報（日程、場所、出欠状況）</li>
          <li>精算情報（参加費の金額・支払い状況）</li>
          <li>利用ログ（アクセス日時、操作履歴）</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2>3. 情報の利用目的</h2>
        <p>収集した情報は、以下の目的で利用します。</p>
        <ul>
          <li>本サービスの提供・運営</li>
          <li>ユーザーからのお問い合わせへの対応</li>
          <li>本サービスの改善・新機能の開発</li>
          <li>利用状況の分析・統計処理</li>
          <li>重要なお知らせの通知</li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2>4. 第三者への提供</h2>
        <p>
          当社は、以下の場合を除き、ユーザーの個人情報を第三者に提供することはありません。
        </p>
        <ul>
          <li>ユーザーの同意がある場合</li>
          <li>法令に基づく場合</li>
          <li>人の生命・身体・財産の保護のために必要がある場合</li>
          <li>
            本サービスの提供に必要な範囲で業務委託先に提供する場合（適切な管理監督のもと）
          </li>
        </ul>
      </section>

      <section className={styles.section}>
        <h2>5. 外部サービスとの連携</h2>
        <p>
          本サービスは、LINE Login（LINEヤフー株式会社）およびSupabase（Supabase
          Inc.）を認証基盤として利用しています。これらのサービスのプライバシーポリシーについては、各サービス提供元のウェブサイトをご確認ください。
        </p>
      </section>

      <section className={styles.section}>
        <h2>6. データの保管</h2>
        <p>
          ユーザーの情報は、適切なセキュリティ対策を施したクラウドサーバー上に保管します。
          データの保管期間は、アカウント削除後90日間とし、その後完全に削除します。
        </p>
      </section>

      <section className={styles.section}>
        <h2>7. ユーザーの権利</h2>
        <p>ユーザーは、以下の権利を有します。</p>
        <ul>
          <li>自己の個人情報の開示を請求する権利</li>
          <li>自己の個人情報の訂正・削除を請求する権利</li>
          <li>自己の個人情報の利用停止を請求する権利</li>
          <li>アカウントの削除を請求する権利</li>
        </ul>
        <p>
          これらの請求は、本サービス内の設定画面またはお問い合わせ窓口より行うことができます。
        </p>
      </section>

      <section className={styles.section}>
        <h2>8. Cookie の使用</h2>
        <p>
          本サービスは、認証状態の維持およびサービス改善のためにCookieを使用します。
          ブラウザの設定によりCookieを無効にすることができますが、その場合一部の機能が利用できなくなることがあります。
        </p>
      </section>

      <section className={styles.section}>
        <h2>9. プライバシーポリシーの変更</h2>
        <p>
          当社は、必要に応じて本ポリシーを変更することがあります。
          重要な変更がある場合は、本サービス上で通知します。
        </p>
      </section>

      <section className={styles.section}>
        <h2>10. お問い合わせ</h2>
        <p>
          プライバシーに関するお問い合わせは、以下の窓口までご連絡ください。
        </p>
        <p>
          メール: <a href="mailto:privacy@mound.dev">privacy@mound.dev</a>
        </p>
      </section>
    </div>
  );
}
