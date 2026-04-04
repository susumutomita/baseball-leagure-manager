import type { Metadata } from "next";
import Link from "next/link";

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
    title: "未読スルーされない出欠回収",
    desc: "LINEで個別にリマインド自動送信。金曜夜に「あと3人！」がわかる。日曜朝の「やっぱ無理」も即反映。",
  },
  {
    title: "グラウンド確保、もう抽選日を忘れない",
    desc: "横浜市・藤沢市など6自治体の空き状況を毎日チェック。空きが出たらLINEで通知。",
  },
  {
    title: "対戦相手、探さなくていい",
    desc: "日程と地域が合うチームを自動で提案。交渉メッセージの作成もサポート。",
  },
  {
    title: "集金のストレスをゼロに",
    desc: "参加費を自動計算してPayPayリンクを送信。「誰が払った？」は管理画面で一目瞭然。",
  },
] as const;

export default function LandingPage() {
  return (
    <div style={{ fontFamily: "'Open Sans', 'Noto Sans JP', sans-serif" }}>
      {/* Hero */}
      <section
        style={{
          padding: "80px 24px 60px",
          maxWidth: 800,
          margin: "0 auto",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: 13,
            color: "#037f0c",
            fontWeight: 700,
            marginBottom: 16,
            letterSpacing: "0.05em",
          }}
        >
          草野球チーム向け試合運営アプリ
        </p>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 700,
            lineHeight: 1.6,
            margin: "0 0 16px",
            color: "#000716",
          }}
        >
          日曜の試合、ちゃんと成立させたい
          <br />
          すべての監督へ。
        </h1>
        <p
          style={{
            fontSize: 16,
            lineHeight: 1.8,
            color: "#5f6b7a",
            margin: "0 0 32px",
            maxWidth: 560,
            marginLeft: "auto",
            marginRight: "auto",
          }}
        >
          出欠回収、グラウンド確保、対戦相手探し、集金。
          <br />
          チーム運営の面倒をまとめて引き受けます。
        </p>
        <Link
          href="/login"
          style={{
            display: "inline-block",
            background: "#0972d3",
            color: "#fff",
            fontSize: 15,
            fontWeight: 700,
            border: "none",
            borderRadius: 8,
            padding: "12px 32px",
            textDecoration: "none",
          }}
        >
          無料ではじめる
        </Link>
      </section>

      {/* Pain points */}
      <section
        style={{
          background: "#fafafa",
          borderTop: "1px solid #eaeded",
          borderBottom: "1px solid #eaeded",
          padding: "48px 24px",
        }}
      >
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "#000716",
              marginBottom: 24,
              textAlign: "center",
            }}
          >
            こんな経験、ありませんか？
          </h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {PAINS.map((pain) => (
              <li
                key={pain}
                style={{
                  padding: "10px 0",
                  borderBottom: "1px solid #eaeded",
                  fontSize: 14,
                  lineHeight: 1.6,
                  color: "#16191f",
                  display: "flex",
                  gap: 10,
                  alignItems: "baseline",
                }}
              >
                <span style={{ color: "#d91515", flexShrink: 0 }}>
                  &#10005;
                </span>
                <span>{pain}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Features */}
      <section
        style={{ padding: "64px 24px", maxWidth: 800, margin: "0 auto" }}
      >
        <h2
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: "#000716",
            marginBottom: 8,
            textAlign: "center",
          }}
        >
          mound が解決します
        </h2>
        <p
          style={{
            fontSize: 14,
            color: "#5f6b7a",
            textAlign: "center",
            marginBottom: 40,
          }}
        >
          試合を成立させるために必要な機能を、ひとつのアプリで
        </p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: 16,
          }}
        >
          {FEATURES.map((f) => (
            <div
              key={f.title}
              style={{
                border: "1px solid #eaeded",
                borderRadius: 8,
                padding: "24px 20px",
                background: "#fff",
              }}
            >
              <h3
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  margin: "0 0 8px",
                  color: "#000716",
                }}
              >
                {f.title}
              </h3>
              <p
                style={{
                  fontSize: 13,
                  color: "#5f6b7a",
                  lineHeight: 1.7,
                  margin: 0,
                }}
              >
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Steps */}
      <section
        style={{
          background: "#fafafa",
          borderTop: "1px solid #eaeded",
          borderBottom: "1px solid #eaeded",
          padding: "48px 24px",
        }}
      >
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <h2
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "#000716",
              marginBottom: 32,
              textAlign: "center",
            }}
          >
            使い方
          </h2>
          {[
            {
              n: 1,
              t: "LINEグループと連携",
              d: "チームのLINEグループを登録するだけ。メンバー一覧が自動で作成されます。",
            },
            {
              n: 2,
              t: "試合を立てる",
              d: "日付と場所を入れたら、出欠回収が自動スタート。リマインドも全自動。",
            },
            {
              n: 3,
              t: "試合成立",
              d: "人数OK・グラウンドOK・相手OK。確定ボタンひとつで全員に通知。",
            },
          ].map((s) => (
            <div
              key={s.n}
              style={{
                display: "flex",
                gap: 16,
                padding: "16px 0",
                borderBottom: s.n < 3 ? "1px solid #eaeded" : "none",
              }}
            >
              <span
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: "#0972d3",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 13,
                  fontWeight: 700,
                  flexShrink: 0,
                }}
              >
                {s.n}
              </span>
              <div>
                <div
                  style={{
                    fontSize: 15,
                    fontWeight: 700,
                    color: "#000716",
                    marginBottom: 4,
                  }}
                >
                  {s.t}
                </div>
                <div
                  style={{ fontSize: 13, color: "#5f6b7a", lineHeight: 1.6 }}
                >
                  {s.d}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section
        style={{ padding: "64px 24px", maxWidth: 640, margin: "0 auto" }}
      >
        <h2
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "#000716",
            marginBottom: 32,
            textAlign: "center",
          }}
        >
          料金
        </h2>
        <div
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}
        >
          <div
            style={{
              border: "1px solid #eaeded",
              borderRadius: 8,
              padding: "28px 20px",
              textAlign: "center",
            }}
          >
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>
              LITE
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#0972d3" }}>
              無料
            </div>
            <div style={{ fontSize: 12, color: "#5f6b7a", marginBottom: 20 }}>
              &nbsp;
            </div>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: "0 0 20px",
                textAlign: "left",
                fontSize: 13,
                color: "#16191f",
              }}
            >
              <li style={{ lineHeight: 2 }}>- 出欠管理（1チーム）</li>
              <li style={{ lineHeight: 2 }}>- 試合作成（月3件まで）</li>
              <li style={{ lineHeight: 2 }}>- LINE通知</li>
            </ul>
            <Link
              href="/login"
              style={{
                display: "inline-block",
                border: "1px solid #0972d3",
                color: "#0972d3",
                fontSize: 14,
                fontWeight: 700,
                borderRadius: 8,
                padding: "8px 24px",
                textDecoration: "none",
              }}
            >
              無料ではじめる
            </Link>
          </div>
          <div
            style={{
              border: "2px solid #0972d3",
              borderRadius: 8,
              padding: "28px 20px",
              textAlign: "center",
              position: "relative",
            }}
          >
            <span
              style={{
                position: "absolute",
                top: -11,
                left: "50%",
                transform: "translateX(-50%)",
                background: "#0972d3",
                color: "#fff",
                fontSize: 11,
                fontWeight: 700,
                padding: "2px 12px",
                borderRadius: 4,
              }}
            >
              おすすめ
            </span>
            <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>
              PRO
            </div>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#0972d3" }}>
              &yen;980
            </div>
            <div style={{ fontSize: 12, color: "#5f6b7a", marginBottom: 20 }}>
              / 月（税込）
            </div>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: "0 0 20px",
                textAlign: "left",
                fontSize: 13,
                color: "#16191f",
              }}
            >
              <li style={{ lineHeight: 2 }}>- 出欠管理（無制限）</li>
              <li style={{ lineHeight: 2 }}>- グラウンド空き監視</li>
              <li style={{ lineHeight: 2 }}>- 対戦相手マッチング</li>
              <li style={{ lineHeight: 2 }}>- 精算・PayPay連携</li>
            </ul>
            <Link
              href="/login"
              style={{
                display: "inline-block",
                background: "#0972d3",
                color: "#fff",
                fontSize: 14,
                fontWeight: 700,
                border: "none",
                borderRadius: 8,
                padding: "8px 24px",
                textDecoration: "none",
              }}
            >
              PROで始める
            </Link>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section
        style={{
          padding: "48px 24px",
          textAlign: "center",
          background: "#f2f3f3",
          borderTop: "1px solid #eaeded",
        }}
      >
        <h2
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: "#000716",
            marginBottom: 8,
          }}
        >
          日曜日の試合、もう心配しなくていい。
        </h2>
        <p style={{ fontSize: 14, color: "#5f6b7a", marginBottom: 24 }}>
          登録は1分。LINEアカウントがあればすぐ始められます。
        </p>
        <Link
          href="/login"
          style={{
            display: "inline-block",
            background: "#0972d3",
            color: "#fff",
            fontSize: 15,
            fontWeight: 700,
            borderRadius: 8,
            padding: "12px 32px",
            textDecoration: "none",
          }}
        >
          無料ではじめる
        </Link>
      </section>
    </div>
  );
}
