import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "mound - 草野球チームの試合運営アプリ",
  description:
    "出欠回収・グラウンド確保・対戦相手探し・集金まで。草野球チームの「試合を成立させる」ために必要なことを、ひとつのアプリで。",
  openGraph: {
    title: "mound - 草野球チームの試合運営アプリ",
    description:
      "出欠回収・グラウンド確保・対戦相手探し・集金まで。草野球チームの「試合を成立させる」ために必要なことを、ひとつのアプリで。",
    type: "website",
    locale: "ja_JP",
  },
};

const PAINS = [
  "LINEで出欠を聞いても、半分は未読スルー",
  "金曜の夜になっても、日曜の試合が9人集まるかわからない",
  "グラウンドの抽選日を忘れて、今月も確保できなかった",
  "対戦相手を探すのに、毎回あちこちに連絡している",
  "試合後の集金で「まだ払ってない人」を追いかけるのがつらい",
  "助っ人を探すために、毎回知り合いに頭を下げている",
] as const;

const FEATURES = [
  {
    label: "01",
    title: "未読スルーされない出欠回収",
    desc: "LINEで個別にリマインド自動送信。金曜夜に「あと3人！」がわかる。日曜朝の「やっぱ無理」も即反映。",
  },
  {
    label: "02",
    title: "グラウンド確保、もう抽選日を忘れない",
    desc: "横浜市・藤沢市など6自治体の空き状況を毎日チェック。空きが出たらLINEで通知。",
  },
  {
    label: "03",
    title: "対戦相手、探さなくていい",
    desc: "日程と地域が合うチームを自動で提案。交渉メッセージの作成もサポート。",
  },
  {
    label: "04",
    title: "集金のストレスをゼロに",
    desc: "参加費を自動計算してPayPayリンクを送信。「誰が払った？」は管理画面で一目瞭然。",
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
          <div className={styles.heroLabel}>草野球チーム向け試合運営アプリ</div>
          <h1 className={styles.heroTitle}>
            試合を「成立」させるのに、
            <br />
            こんなに苦労していませんか？
          </h1>
          <p className={styles.heroSub}>
            出欠回収、グラウンド確保、対戦相手探し、集金。
            <br />
            監督がひとりで抱えていた面倒を、mound がまとめて引き受けます。
          </p>
          <Link href="/login" className={styles.ctaButton}>
            無料ではじめる
          </Link>
        </div>
      </section>

      {/* Pain points */}
      <section className={styles.painSection}>
        <h2 className={styles.painTitle}>こんな経験、ありませんか？</h2>
        <ul className={styles.painList}>
          {PAINS.map((pain) => (
            <li key={pain} className={styles.painItem}>
              <span className={styles.painCheck}>&#10003;</span>
              <span>{pain}</span>
            </li>
          ))}
        </ul>
      </section>

      {/* Features */}
      <section id="features" className={styles.section}>
        <h2 className={styles.sectionTitle}>mound が解決すること</h2>
        <p className={styles.sectionSub}>
          試合を成立させるために必要な機能を、ひとつのアプリで
        </p>
        <div className={styles.featuresGrid}>
          {FEATURES.map((f) => (
            <div key={f.label} className={styles.featureCard}>
              <div className={styles.featureNumber}>{f.label}</div>
              <h3 className={styles.featureTitle}>{f.title}</h3>
              <p className={styles.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="howto" className={styles.stepsSection}>
        <div className={styles.stepsInner}>
          <h2 className={styles.sectionTitle}>使い方</h2>
          <p className={styles.sectionSub}>
            面倒な初期設定は不要。すぐに使い始められます
          </p>
          <div className={styles.stepsRow}>
            {STEPS.map((s) => (
              <div key={s.number} className={styles.step}>
                <div className={styles.stepNumber}>{s.number}</div>
                <div className={styles.stepContent}>
                  <h3 className={styles.stepTitle}>{s.title}</h3>
                  <p className={styles.stepDesc}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className={styles.pricingSection}>
        <div className={styles.pricingInner}>
          <h2 className={styles.sectionTitle}>料金</h2>
          <p className={styles.sectionSub}>まずは無料で試してみてください</p>
          <div className={styles.pricingGrid}>
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
                <li>優先サポート</li>
              </ul>
              <Link href="/login" className={styles.ctaButton}>
                PROで始める
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className={styles.ctaSection}>
        <h2 className={styles.ctaTitle}>
          日曜日の試合、もう心配しなくていい。
        </h2>
        <p className={styles.ctaSub}>
          登録は1分。LINEアカウントがあればすぐ始められます。
        </p>
        <Link href="/login" className={styles.ctaButton}>
          無料ではじめる
        </Link>
      </section>
    </>
  );
}
