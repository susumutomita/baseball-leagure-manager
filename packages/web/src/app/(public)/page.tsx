import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "mound - 金曜の夜、LINEの出欠まだ5人しか返事がない",
  description:
    "出欠回収・グラウンド確保・対戦相手探し・集金まで。草野球チームの試合成立をAIがサポートする運営エンジン。",
  openGraph: {
    title: "mound - 金曜の夜、LINEの出欠まだ5人しか返事がない",
    description:
      "出欠回収・グラウンド確保・対戦相手探し・集金まで。草野球チームの試合成立をAIがサポートする運営エンジン。",
    type: "website",
    locale: "ja_JP",
  },
  twitter: {
    card: "summary_large_image",
    title: "mound - 金曜の夜、LINEの出欠まだ5人しか返事がない",
    description:
      "出欠回収・グラウンド確保・対戦相手探し・集金まで。草野球チームの試合成立をAIがサポートする運営エンジン。",
  },
};

const FEATURES = [
  {
    abbr: "出欠",
    title: "未読スルーされない出欠回収",
    desc: "LINEで個別にリマインド自動送信。金曜夜に「あと3人！」がわかる。日曜朝の「やっぱ無理」も即反映。",
  },
  {
    abbr: "球場",
    title: "グラウンド確保、もう抽選日を忘れない",
    desc: "横浜市・藤沢市など6自治体の空き状況を毎日チェック。空きが出たらすぐ通知。",
  },
  {
    abbr: "対戦",
    title: "対戦相手、探さなくていい",
    desc: "日程と地域が合うチームを自動提案。メッセージ作成もAIがサポート。",
  },
  {
    abbr: "精算",
    title: "集金のストレスをゼロに",
    desc: "参加費を自動計算してPayPayリンクを送信。「誰が払った？」を管理画面で一目瞭然。",
  },
] as const;

const STEPS = [
  {
    number: 1,
    title: "LINEグループと連携",
    desc: "チームのLINEグループを登録するだけ。メンバー一覧が自動で作成されます。",
  },
  {
    number: 2,
    title: "試合を立てる",
    desc: "日付と場所を入れたら、出欠回収が自動スタート。リマインドも全自動。",
  },
  {
    number: 3,
    title: "試合成立",
    desc: "人数OK・グラウンドOK・相手OK。確定ボタンひとつで全員に通知。",
  },
] as const;

export default function LandingPage() {
  return (
    <>
      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <h1 className={styles.heroTitle}>
            金曜の夜。LINEの出欠、
            <br />
            まだ5人しか返事がない。
          </h1>
          <p className={styles.heroSub}>
            「9人集まるのか」「グラウンドどうする」「相手チームは」——
            <br />
            全部、mound が解決します。
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
