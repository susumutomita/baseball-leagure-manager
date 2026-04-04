import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "mound - 草野球チームの試合運営を、もっとスマートに",
  description:
    "出欠管理・グラウンド監視・対戦相手マッチング・精算まで。草野球チームの試合成立をAIがサポートする運営エンジン。",
  openGraph: {
    title: "mound - 草野球チームの試合運営を、もっとスマートに",
    description:
      "出欠管理・グラウンド監視・対戦相手マッチング・精算まで。草野球チームの試合成立をAIがサポートする運営エンジン。",
    type: "website",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "mound - 草野球チームの試合運営を、もっとスマートに",
    description:
      "出欠管理・グラウンド監視・対戦相手マッチング・精算まで。草野球チームの試合成立をAIがサポートする運営エンジン。",
  },
};

const FEATURES = [
  {
    abbr: "出欠",
    title: "出欠管理",
    desc: "LINEで出欠を回収。リマインド自動送信で未回答者を減らし、試合成立の見通しをリアルタイムに把握できます。",
  },
  {
    abbr: "球場",
    title: "グラウンド監視",
    desc: "空きグラウンド情報を自動取得。抽選日程や空き状況をチームに通知し、確保のチャンスを逃しません。",
  },
  {
    abbr: "対戦",
    title: "対戦相手マッチング",
    desc: "日程・地域・レベルが合うチームを自動で提案。対戦相手探しの手間を大幅に削減します。",
  },
  {
    abbr: "精算",
    title: "精算・PayPay連携",
    desc: "参加費の自動計算とPayPayリンク送信。集金の手間とトラブルをゼロにします。",
  },
] as const;

const STEPS = [
  {
    number: 1,
    title: "チーム登録",
    desc: "LINEグループと連携するだけ。メンバー情報は自動で取り込まれます。",
  },
  {
    number: 2,
    title: "試合作成",
    desc: "日程と場所を入力するだけで、出欠回収から対戦相手探しまで自動で開始します。",
  },
  {
    number: 3,
    title: "自動運営",
    desc: "AIが試合成立までの段取りを提案。あなたは最終確認するだけです。",
  },
] as const;

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>
            草野球チームの試合運営を、
            <br />
            もっとスマートに
          </h1>
          <p className={styles.heroSub}>
            出欠管理・グラウンド確保・対戦相手探し・精算まで。
            <br />
            試合成立に必要なすべてを、AIがサポートします。
          </p>
          <Link href="/login" className={styles.ctaButton}>
            無料ではじめる
          </Link>
        </div>
      </section>

      {/* Features */}
      <section id="features" className={styles.section}>
        <h2 className={styles.sectionTitle}>主な機能</h2>
        <p className={styles.sectionSub}>
          試合を「成立」させるために必要な機能をワンストップで
        </p>
        <div className={styles.featuresGrid}>
          {FEATURES.map((f) => (
            <div key={f.title} className={styles.featureCard}>
              <div className={styles.featureIcon}>{f.abbr}</div>
              <h3 className={styles.featureTitle}>{f.title}</h3>
              <p className={styles.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="howto" className={styles.section}>
        <h2 className={styles.sectionTitle}>かんたん3ステップ</h2>
        <p className={styles.sectionSub}>
          面倒な初期設定は不要。すぐに使い始められます
        </p>
        <div className={styles.stepsRow}>
          {STEPS.map((s) => (
            <div key={s.number} className={styles.step}>
              <div className={styles.stepNumber}>{s.number}</div>
              <h3 className={styles.stepTitle}>{s.title}</h3>
              <p className={styles.stepDesc}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className={styles.pricingSection}>
        <div className={styles.pricingInner}>
          <h2 className={styles.sectionTitle}>料金プラン</h2>
          <p className={styles.sectionSub}>まずは無料プランでお試しください</p>
          <div className={styles.pricingGrid}>
            {/* LITE */}
            <div className={styles.pricingCard}>
              <h3 className={styles.planName}>LITE</h3>
              <div className={styles.planPrice}>無料</div>
              <div className={styles.planPriceSub}>&nbsp;</div>
              <ul className={styles.planFeatures}>
                <li>出欠管理（1チーム）</li>
                <li>試合作成（月3件まで）</li>
                <li>LINE通知</li>
                <li>基本統計</li>
              </ul>
              <Link href="/login" className={styles.ctaButtonLite}>
                無料ではじめる
              </Link>
            </div>

            {/* PRO */}
            <div className={styles.pricingCardPro}>
              <span className={styles.proBadge}>おすすめ</span>
              <h3 className={styles.planName}>PRO</h3>
              <div className={styles.planPrice}>&yen;980</div>
              <div className={styles.planPriceSub}>/ 月（税込）</div>
              <ul className={styles.planFeatures}>
                <li>出欠管理（無制限）</li>
                <li>試合作成（無制限）</li>
                <li>グラウンド空き監視</li>
                <li>対戦相手マッチング</li>
                <li>精算・PayPay連携</li>
                <li>AI運営アシスタント</li>
                <li>優先サポート</li>
              </ul>
              <Link href="/login" className={styles.ctaButton}>
                PROで始める
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
