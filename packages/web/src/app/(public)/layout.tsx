import Link from "next/link";
import styles from "./layout.module.css";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.pageWrapper}>
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>
          mound
        </Link>
        <Link href="/login">
          <button type="button" className={styles.loginButton}>
            ログイン
          </button>
        </Link>
      </header>

      <main>{children}</main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerSection}>
            <h4>mound</h4>
            <p>
              草野球チーム向け
              <br />
              試合成立エンジン
            </p>
          </div>
          <div className={styles.footerSection}>
            <h4>プロダクト</h4>
            <Link href="/#features">機能</Link>
            <Link href="/#pricing">料金プラン</Link>
            <Link href="/#howto">使い方</Link>
            <Link href="/docs">ドキュメント</Link>
          </div>
          <div className={styles.footerSection}>
            <h4>法的情報</h4>
            <Link href="/terms">利用規約</Link>
            <Link href="/privacy">プライバシーポリシー</Link>
            <Link href="/legal">特定商取引法に基づく表記</Link>
          </div>
          <div className={styles.footerSection}>
            <h4>サポート</h4>
            <Link href="/contact">お問い合わせ</Link>
            <Link href="/help">ヘルプセンター</Link>
          </div>
        </div>
        <div className={styles.footerBottom}>
          &copy; 2026 mound. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
