import type { Metadata } from "next";
import styles from "../terms/page.module.css";

export const metadata: Metadata = {
  title: "特定商取引法に基づく表記 - mound",
  description: "mound の特定商取引法に基づく表記です。",
};

export default function LegalPage() {
  return (
    <div className={styles.container}>
      <h1 className={styles.title}>特定商取引法に基づく表記</h1>
      <p className={styles.updated}>最終更新日: 2026年4月1日</p>

      <section className={styles.section}>
        <h2>事業者名</h2>
        <p>mound 運営事務局</p>
      </section>

      <section className={styles.section}>
        <h2>代表者</h2>
        <p>（代表者名を記載）</p>
      </section>

      <section className={styles.section}>
        <h2>所在地</h2>
        <p>（所在地を記載）</p>
      </section>

      <section className={styles.section}>
        <h2>連絡先</h2>
        <p>
          メールアドレス: support@mound.dev
          <br />
          ※お問い合わせはメールにて承ります。
        </p>
      </section>

      <section className={styles.section}>
        <h2>販売価格</h2>
        <p>
          各プランの料金は、サービスサイトの料金ページに記載しております。
          <br />
          表示価格は税込みです。
        </p>
      </section>

      <section className={styles.section}>
        <h2>支払方法</h2>
        <p>クレジットカード決済</p>
      </section>

      <section className={styles.section}>
        <h2>サービスの提供時期</h2>
        <p>お申し込み手続き完了後、直ちにサービスをご利用いただけます。</p>
      </section>

      <section className={styles.section}>
        <h2>返品・キャンセルについて</h2>
        <p>
          デジタルサービスの性質上、サービス提供開始後の返品・返金はお受けしておりません。
          <br />
          月額プランはいつでも解約が可能です。解約した場合、次回更新日をもってサービスの提供を終了いたします。
        </p>
      </section>
    </div>
  );
}
