import type { Metadata } from "next";
import styles from "../docs.module.css";

export const metadata: Metadata = {
  title: "API リファレンス | mound",
  description:
    "mound REST API のエンドポイント一覧、リクエスト・レスポンス仕様",
};

function Endpoint({
  method,
  path,
  description,
  children,
}: {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string;
  description: string;
  children?: React.ReactNode;
}) {
  const methodClass =
    method === "GET"
      ? styles.methodGet
      : method === "POST"
        ? styles.methodPost
        : method === "PATCH"
          ? styles.methodPatch
          : styles.methodDelete;

  return (
    <div className={styles.endpointCard}>
      <div className={styles.endpointHeader}>
        <span className={`${styles.methodBadge} ${methodClass}`}>{method}</span>
        <span className={styles.endpointPath}>{path}</span>
      </div>
      <div className={styles.endpointBody}>
        <p className={styles.endpointDesc}>{description}</p>
        {children}
      </div>
    </div>
  );
}

export default function ApiDocsPage() {
  return (
    <>
      <h1 className={styles.pageTitle}>API リファレンス</h1>
      <p className={styles.pageDescription}>
        mound の REST API エンドポイント一覧です。全てのエンドポイントは JSON
        形式でリクエスト・レスポンスを扱います。
      </p>

      {/* Authentication */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>認証</h2>
        <p className={styles.paragraph}>
          API へのアクセスには Supabase Auth による JWT
          トークンが必要です。リクエストヘッダーに{" "}
          <code className={styles.codeInline}>Authorization</code>{" "}
          を含めてください。
        </p>
        <div className={styles.codeBlock}>
          {"Authorization: Bearer <supabase-jwt-token>"}
        </div>
        <p className={styles.paragraph}>
          LIFF エンドポイント（
          <code className={styles.codeInline}>/api/liff/*</code>）は LINE
          のアクセストークンで認証します。Cron エンドポイント（
          <code className={styles.codeInline}>/api/cron/*</code>）は{" "}
          <code className={styles.codeInline}>CRON_SECRET</code>{" "}
          ヘッダーで認証します。
        </p>
      </div>

      {/* Response format */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>レスポンス形式</h2>
        <p className={styles.paragraph}>
          全エンドポイントは統一された JSON
          構造を返します。エージェントが次のアクションを自律的に判断できるよう、
          <code className={styles.codeInline}>next_actions</code>{" "}
          フィールドが含まれます。
        </p>
        <div className={styles.codeBlock}>
          {`// 成功レスポンス
{
  "data": { ... },
  "meta": {
    "status": "COLLECTING",
    "available_count": 7,
    "min_players": 9
  },
  "next_actions": [
    {
      "action": "check_rsvps",
      "reason": "2人の未回答メンバーがいます",
      "priority": "high"
    }
  ]
}

// エラーレスポンス
{
  "error": "状態遷移が不正です: DRAFT → CONFIRMED",
  "error_code": "INVALID_TRANSITION",
  "next_actions": [
    {
      "action": "transition_game",
      "reason": "まず COLLECTING に遷移してください",
      "suggested_params": { "new_status": "COLLECTING" }
    }
  ]
}`}
        </div>
      </div>

      {/* Rate limiting */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>レート制限</h2>
        <div className={styles.note}>
          API にはレート制限が適用されます。1分あたり 60
          リクエストを超えた場合、HTTP 429 が返されます。レスポンスヘッダーの{" "}
          <code className={styles.codeInline}>X-RateLimit-Remaining</code>{" "}
          で残りリクエスト数を確認できます。
        </div>
      </div>

      {/* Games endpoints */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>試合 (Games)</h2>

        <Endpoint
          method="POST"
          path="/api/games"
          description="新しい試合を作成します。DRAFT ステータスで作成されます。"
        >
          <div className={styles.codeBlock}>
            {`// リクエスト
{
  "team_id": "uuid",
  "title": "4/12 vs 横国さん",
  "game_type": "FRIENDLY",       // PRACTICE | FRIENDLY | LEAGUE | TOURNAMENT
  "game_date": "2026-04-12",     // optional
  "start_time": "09:00",         // optional
  "end_time": "12:00",           // optional
  "ground_name": "八部公園野球場", // optional
  "min_players": 9,              // default: 9
  "rsvp_deadline": "2026-03-29T23:59:59+09:00", // optional
  "note": "集合は8:30"           // optional
}`}
          </div>
        </Endpoint>

        <Endpoint
          method="GET"
          path="/api/games?team_id={id}"
          description="チームの試合一覧を取得します。ステータスや日付でフィルタリングできます。"
        />

        <Endpoint
          method="GET"
          path="/api/games/{id}"
          description="試合の詳細情報を取得します。出欠集計・次のアクション候補を含みます。"
        >
          <div className={styles.codeBlock}>
            {`// レスポンス
{
  "data": {
    "id": "uuid",
    "title": "4/12 vs 横国さん",
    "status": "COLLECTING",
    "game_date": "2026-04-12",
    "rsvp_summary": {
      "available": 7,
      "unavailable": 3,
      "maybe": 2,
      "no_response": 3
    }
  },
  "next_actions": [
    {
      "action": "create_helper_requests",
      "reason": "現在7人。最低9人必要。助っ人2人の打診を推奨",
      "priority": "medium"
    }
  ]
}`}
          </div>
        </Endpoint>

        <Endpoint
          method="PATCH"
          path="/api/games/{id}"
          description="試合情報を更新します。DRAFT ステータスの試合のみ編集可能です。"
        />

        <Endpoint
          method="POST"
          path="/api/games/{id}/transition"
          description="試合のステータスを遷移させます。CONFIRMED への遷移はガバナー条件の充足が必要です。"
        >
          <div className={styles.codeBlock}>
            {`// リクエスト
{
  "status": "COLLECTING",  // 遷移先ステータス
  "version": 1,            // 楽観ロック用 (optional)
  "actor_id": "user-uuid"
}

// 許可される遷移:
// DRAFT → COLLECTING | CONFIRMED | CANCELLED
// COLLECTING → CONFIRMED | CANCELLED
// CONFIRMED → COMPLETED | CANCELLED
// COMPLETED → SETTLED`}
          </div>
        </Endpoint>

        <Endpoint
          method="POST"
          path="/api/games/{id}/validate"
          description="試合が確定 (CONFIRMED) 条件を満たしているか検証します。"
        >
          <div className={styles.codeBlock}>
            {`// レスポンス
{
  "data": {
    "can_confirm": false,
    "checks": {
      "min_players_met": false,
      "has_ground": true,
      "has_opponent": true,
      "has_game_date": true
    },
    "available_count": 7,
    "min_players": 9
  },
  "next_actions": [
    {
      "action": "create_helper_requests",
      "reason": "あと2人必要です",
      "priority": "high"
    }
  ]
}`}
          </div>
        </Endpoint>
      </div>

      {/* RSVP endpoints */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>出欠 (RSVPs)</h2>

        <Endpoint
          method="POST"
          path="/api/games/{id}/rsvps"
          description="全メンバーに出欠確認を送信します。各メンバーに RSVP レコードが作成されます。"
        />

        <Endpoint
          method="GET"
          path="/api/games/{id}/rsvps"
          description="出欠回答の一覧と集計を取得します。"
        >
          <div className={styles.codeBlock}>
            {`// レスポンス
{
  "data": [
    {
      "id": "uuid",
      "member_id": "uuid",
      "member_name": "田中",
      "response": "AVAILABLE",
      "responded_at": "2026-03-20T10:00:00+09:00",
      "response_channel": "LINE"
    }
  ],
  "meta": {
    "available": 7,
    "unavailable": 3,
    "maybe": 2,
    "no_response": 3,
    "total": 15
  }
}`}
          </div>
        </Endpoint>

        <Endpoint
          method="PATCH"
          path="/api/rsvps/{id}"
          description="出欠回答を登録・更新します。AVAILABLE / UNAVAILABLE / MAYBE のいずれか。"
        >
          <div className={styles.codeBlock}>
            {`// リクエスト
{
  "response": "AVAILABLE",          // AVAILABLE | UNAVAILABLE | MAYBE
  "channel": "LINE"                 // APP | LINE | EMAIL | WEB
}`}
          </div>
        </Endpoint>
      </div>

      {/* Helper endpoints */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>助っ人 (Helpers)</h2>

        <Endpoint
          method="GET"
          path="/api/helpers?team_id={id}"
          description="チームに登録されている助っ人候補の一覧を取得します。信頼度順でソートされます。"
        />

        <Endpoint
          method="POST"
          path="/api/games/{id}/helper-requests"
          description="助っ人に参加依頼を送信します。複数の助っ人を一括で依頼できます。"
        >
          <div className={styles.codeBlock}>
            {`// リクエスト
{
  "helper_ids": ["uuid-1", "uuid-2"],
  "message": "4/12の試合、助っ人お願いできますか？",  // optional
  "actor_id": "user-uuid"
}`}
          </div>
        </Endpoint>

        <Endpoint
          method="PATCH"
          path="/api/helper-requests/{id}"
          description="助っ人打診の回答を更新します。充足時は未回答の打診を自動キャンセルします。"
        >
          <div className={styles.codeBlock}>
            {`// リクエスト
{
  "status": "ACCEPTED"  // ACCEPTED | DECLINED | CANCELLED
}`}
          </div>
        </Endpoint>
      </div>

      {/* Negotiation endpoints */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>対戦交渉 (Negotiations)</h2>

        <Endpoint
          method="POST"
          path="/api/games/{id}/negotiations"
          description="相手チームとの対戦交渉を開始します。候補日を提示して交渉を作成します。"
        >
          <div className={styles.codeBlock}>
            {`// リクエスト
{
  "opponent_team_id": "uuid",
  "proposed_dates": ["2026-04-12", "2026-04-19"],
  "message": "4月に練習試合をお願いできますか？",  // optional
  "actor_id": "user-uuid"
}`}
          </div>
        </Endpoint>

        <Endpoint
          method="GET"
          path="/api/games/{id}/negotiations"
          description="試合に関連する対戦交渉の一覧を取得します。"
        />

        <Endpoint
          method="PATCH"
          path="/api/negotiations/{id}"
          description="交渉のステータスを更新します。SENT → REPLIED → ACCEPTED / DECLINED の順に進みます。"
        >
          <div className={styles.codeBlock}>
            {`// リクエスト
{
  "status": "ACCEPTED",           // SENT | REPLIED | ACCEPTED | DECLINED | CANCELLED
  "reply_message": "4/12で承りました",  // optional
  "cancel_reason": null           // optional
}`}
          </div>
        </Endpoint>
      </div>

      {/* Settlement endpoints */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>精算 (Settlement)</h2>

        <Endpoint
          method="POST"
          path="/api/games/{id}/expenses"
          description="試合の費用を登録します。グラウンド代・審判代・ボール代などを追加します。"
        >
          <div className={styles.codeBlock}>
            {`// リクエスト
{
  "category": "GROUND",           // GROUND | UMPIRE | BALL | DRINK | TOURNAMENT_FEE | OTHER
  "amount": 5000,                 // 金額 (円)
  "paid_by": "member-uuid",       // 立替者 (optional)
  "split_with_opponent": true,    // 相手チームと折半 (default: false)
  "note": "グラウンド使用料"       // optional
}`}
          </div>
        </Endpoint>

        <Endpoint
          method="GET"
          path="/api/games/{id}/expenses"
          description="試合に登録されている費用の一覧を取得します。"
        />

        <Endpoint
          method="POST"
          path="/api/games/{id}/settlement"
          description="精算を計算します。参加者ごとの支払い額を算出します。"
        >
          <div className={styles.codeBlock}>
            {`// レスポンス
{
  "data": {
    "total_cost": 10000,
    "opponent_share": 2500,
    "team_cost": 7500,
    "member_count": 10,
    "per_member": 750,
    "status": "DRAFT"
  }
}`}
          </div>
        </Endpoint>

        <Endpoint
          method="POST"
          path="/api/games/{id}/settlement/notify"
          description="精算結果をメンバーに通知します。PayPay 送金リンクを含みます。"
        />

        <Endpoint
          method="POST"
          path="/api/games/{id}/settlement/complete"
          description="精算を完了としてマークします。"
        />
      </div>

      {/* Results endpoints */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>試合結果 (Results)</h2>

        <Endpoint
          method="POST"
          path="/api/games/{id}/results"
          description="試合結果を記録します。スコア、打撃成績、投手成績を登録します。"
        >
          <div className={styles.codeBlock}>
            {`// リクエスト
{
  "our_score": 5,
  "opponent_score": 3,
  "innings": 7,
  "note": "好ゲーム"
}`}
          </div>
        </Endpoint>
      </div>

      {/* Team endpoints */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>チーム (Teams)</h2>

        <Endpoint
          method="POST"
          path="/api/teams"
          description="新しいチームを作成します。作成者が自動的にオーナーになります。"
        />

        <Endpoint
          method="GET"
          path="/api/teams"
          description="ログインユーザーが所属するチームの一覧を取得します。"
        />

        <Endpoint
          method="GET"
          path="/api/teams/{id}/members"
          description="チームメンバーの一覧を取得します。出席率付き。"
        />

        <Endpoint
          method="GET"
          path="/api/teams/{id}/opponents"
          description="登録済みの対戦相手チーム一覧を取得します。"
        />

        <Endpoint
          method="GET"
          path="/api/teams/{id}/stats"
          description="チームの成績統計を取得します。勝敗数、個人打率ランキングなど。"
        />

        <Endpoint
          method="GET"
          path="/api/teams/{id}/calendar"
          description="チームの試合カレンダーを取得します。"
        />

        <Endpoint
          method="GET"
          path="/api/teams/{id}/policy"
          description="チームの交渉ポリシーを取得します。"
        >
          <div className={styles.codeBlock}>
            {`// レスポンス
{
  "data": {
    "auto_accept": false,
    "preferred_days": ["SATURDAY", "SUNDAY"],
    "preferred_time_slots": ["MORNING"],
    "max_travel_minutes": 30,
    "min_notice_days": 14,
    "blackout_dates": ["2026-05-03", "2026-05-04"]
  }
}`}
          </div>
        </Endpoint>
      </div>

      {/* Notification endpoints */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>通知 (Notifications)</h2>

        <Endpoint
          method="POST"
          path="/api/notifications/send"
          description="通知を送信します。LINE Push / メール / プッシュ通知のチャネルを指定できます。"
        />

        <Endpoint
          method="POST"
          path="/api/notifications/remind"
          description="未回答メンバーにリマインド通知を送信します。"
        />

        <Endpoint
          method="GET"
          path="/api/notifications/history"
          description="通知履歴を取得します。"
        />
      </div>

      {/* AI endpoints */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>AI 機能</h2>

        <Endpoint
          method="POST"
          path="/api/ai/predict-attendance"
          description="メンバーの出欠を予測します。過去の出席率・曜日・天候などを考慮します。"
        >
          <div className={styles.codeBlock}>
            {`// リクエスト
{ "game_id": "uuid" }

// レスポンス
{
  "data": {
    "predictions": [
      {
        "member_id": "uuid",
        "name": "田中",
        "probability": 0.85,
        "factors": ["高い出席率", "土曜午前は参加傾向"]
      }
    ],
    "expected_count": 11
  }
}`}
          </div>
        </Endpoint>

        <Endpoint
          method="POST"
          path="/api/ai/recommend-helpers"
          description="試合に適した助っ人を推薦します。信頼度・過去実績・ポジション適性を考慮します。"
        >
          <div className={styles.codeBlock}>
            {`// リクエスト
{ "game_id": "uuid" }

// レスポンス
{
  "data": {
    "recommendations": [
      {
        "helper_id": "uuid",
        "name": "佐藤",
        "score": 0.92,
        "reasons": ["信頼度が高い", "キャッチャー経験あり"]
      }
    ],
    "needed_count": 2
  }
}`}
          </div>
        </Endpoint>

        <Endpoint
          method="POST"
          path="/api/ai/generate-message"
          description="対戦交渉用のメッセージを AI が生成します。相手チーム情報・候補日を考慮します。"
        >
          <div className={styles.codeBlock}>
            {`// リクエスト
{
  "game_id": "uuid",
  "opponent_team_id": "uuid"
}

// レスポンス
{
  "data": {
    "message": "○○チーム ご担当者様\\n\\n4月に練習試合をお願いできればと..."
  }
}`}
          </div>
        </Endpoint>

        <Endpoint
          method="POST"
          path="/api/ai/weekly-report"
          description="チームの週次レポートを生成します。今週の試合予定・出欠状況・ToDo をまとめます。"
        >
          <div className={styles.codeBlock}>
            {`// リクエスト
{ "team_id": "uuid" }

// レスポンス
{
  "data": {
    "report": "## 今週のサマリー\\n- 4/12 vs 横国さん: 出欠回収中 (7/15)..."
  }
}`}
          </div>
        </Endpoint>
      </div>

      {/* LIFF endpoints */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>LIFF (LINE連携)</h2>
        <p className={styles.paragraph}>
          LINE LIFF アプリ向けのエンドポイントです。LINE
          のアクセストークンで認証します。
        </p>

        <Endpoint
          method="POST"
          path="/api/liff/verify"
          description="LIFF トークンを検証し、ユーザー情報を返します。"
        />

        <Endpoint
          method="POST"
          path="/api/liff/register"
          description="LINE ユーザーをシステムに登録します。"
        />

        <Endpoint
          method="GET"
          path="/api/liff/games/{id}/my-rsvp"
          description="LINE ユーザーの出欠回答状況を取得します。"
        />
      </div>

      {/* Cron endpoints */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Cron ジョブ</h2>
        <p className={styles.paragraph}>
          定期実行されるバックグラウンド処理です。
          <code className={styles.codeInline}>CRON_SECRET</code>{" "}
          ヘッダーによる認証が必要です。
        </p>

        <Endpoint
          method="POST"
          path="/api/cron/process-deadlines"
          description="出欠締切が到来した試合を処理します。未回答を NO_RESPONSE に確定し、状態を遷移させます。"
        />

        <Endpoint
          method="POST"
          path="/api/cron/send-reminders"
          description="出欠未回答のメンバーにリマインド通知を送信します。締切の 72h/48h/24h 前に段階的に送信します。"
        />

        <Endpoint
          method="POST"
          path="/api/cron/check-fulfillment"
          description="助っ人の充足状況をチェックします。人数が揃った場合、未回答の打診を自動キャンセルします。"
        />
      </div>

      {/* Grounds endpoints */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>グラウンド (Grounds)</h2>

        <Endpoint
          method="GET"
          path="/api/grounds/{id}/slots"
          description="グラウンドの空き状況を取得します。スロット単位 (MORNING / AFTERNOON / EVENING) で返します。"
        />

        <Endpoint
          method="POST"
          path="/api/grounds/webhook"
          description="グラウンド予約サイトからのウェブフック。空き状況の変更を受信します。"
        />
      </div>
    </>
  );
}
