import Link from "next/link";
import styles from "./layout.module.css";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <header className={styles.header}>
        <Link href="/" className={styles.logo}>
          mound
        </Link>
        <Link href="/login">
          <button
            type="button"
            style={{
              background: "#0972d3",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "8px 20px",
              fontSize: 14,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            ログイン
          </button>
        </Link>
      </header>

      <main>{children}</main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerSection}>
            <h4>mound</h4>
            <p style={{ fontSize: 13, lineHeight: 1.6 }}>
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
          </div>
          <div className={styles.footerSection}>
            <h4>法的情報</h4>
            <Link href="/terms">利用規約</Link>
            <Link href="/privacy">プライバシーポリシー</Link>
          </div>
          <div className={styles.footerSection}>
            <h4>サポート</h4>
            <a
              href="mailto:support@mound.dev"
              target="_blank"
              rel="noopener noreferrer"
            >
              お問い合わせ
            </a>
          </div>
        </div>
        <div className={styles.footerBottom}>
          &copy; 2026 mound. All rights reserved.
        </div>
      </footer>
    </>
  );
}
