"use client";

import Box from "@cloudscape-design/components/box";
import Container from "@cloudscape-design/components/container";
import ContentLayout from "@cloudscape-design/components/content-layout";
import Header from "@cloudscape-design/components/header";
import SpaceBetween from "@cloudscape-design/components/space-between";
import StatusIndicator from "@cloudscape-design/components/status-indicator";

function MethodBadge({
  method,
}: { method: "GET" | "POST" | "PATCH" | "DELETE" }) {
  const typeMap: Record<string, "success" | "info" | "warning" | "error"> = {
    GET: "success",
    POST: "info",
    PATCH: "warning",
    DELETE: "error",
  };
  return <StatusIndicator type={typeMap[method]}>{method}</StatusIndicator>;
}

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
  return (
    <Container
      header={
        <Header variant="h3">
          <SpaceBetween direction="horizontal" size="xs">
            <MethodBadge method={method} />
            <Box variant="code">{path}</Box>
          </SpaceBetween>
        </Header>
      }
    >
      <SpaceBetween size="s">
        <Box variant="p">{description}</Box>
        {children}
      </SpaceBetween>
    </Container>
  );
}

export default function ApiDocsPage() {
  return (
    <ContentLayout
      defaultPadding
      header={
        <Header
          variant="h1"
          description="mound の REST API エンドポイント一覧です。全てのエンドポイントは JSON 形式でリクエスト・レスポンスを扱います。"
        >
          API リファレンス
        </Header>
      }
    >
      <SpaceBetween size="l">
        {/* Authentication */}
        <Container header={<Header variant="h2">認証</Header>}>
          <SpaceBetween size="s">
            <Box variant="p">
              API へのアクセスには Supabase Auth による JWT
              トークンが必要です。リクエストヘッダーに{" "}
              <Box variant="code" display="inline">
                Authorization
              </Box>{" "}
              を含めてください。
            </Box>
            <Box variant="code">
              {"Authorization: Bearer <supabase-jwt-token>"}
            </Box>
            <Box variant="p">
              LIFF エンドポイント（
              <Box variant="code" display="inline">
                /api/liff/*
              </Box>
              ）は LINE のアクセストークンで認証します。Cron エンドポイント（
              <Box variant="code" display="inline">
                /api/cron/*
              </Box>
              ）は{" "}
              <Box variant="code" display="inline">
                CRON_SECRET
              </Box>{" "}
              ヘッダーで認証します。
            </Box>
          </SpaceBetween>
        </Container>

        {/* Response format */}
        <Container header={<Header variant="h2">レスポンス形式</Header>}>
          <SpaceBetween size="s">
            <Box variant="p">
              全エンドポイントは統一された JSON
              構造を返します。エージェントが次のアクションを自律的に判断できるよう、
              <Box variant="code" display="inline">
                next_actions
              </Box>{" "}
              フィールドが含まれます。
            </Box>
            <Box variant="code">
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
            </Box>
          </SpaceBetween>
        </Container>

        {/* Rate limiting */}
        <Container header={<Header variant="h2">レート制限</Header>}>
          <Box variant="p">
            API にはレート制限が適用されます。1分あたり 60
            リクエストを超えた場合、HTTP 429 が返されます。レスポンスヘッダーの{" "}
            <Box variant="code" display="inline">
              X-RateLimit-Remaining
            </Box>{" "}
            で残りリクエスト数を確認できます。
          </Box>
        </Container>

        {/* Games endpoints */}
        <Container header={<Header variant="h2">試合 (Games)</Header>}>
          <SpaceBetween size="m">
            <Endpoint
              method="POST"
              path="/api/games"
              description="新しい試合を作成します。DRAFT ステータスで作成されます。"
            >
              <Box variant="code">
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
              </Box>
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
              <Box variant="code">
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
              </Box>
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
              <Box variant="code">
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
              </Box>
            </Endpoint>

            <Endpoint
              method="POST"
              path="/api/games/{id}/validate"
              description="試合が確定 (CONFIRMED) 条件を満たしているか検証します。"
            >
              <Box variant="code">
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
              </Box>
            </Endpoint>
          </SpaceBetween>
        </Container>

        {/* RSVP endpoints */}
        <Container header={<Header variant="h2">出欠 (RSVPs)</Header>}>
          <SpaceBetween size="m">
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
              <Box variant="code">
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
              </Box>
            </Endpoint>

            <Endpoint
              method="PATCH"
              path="/api/rsvps/{id}"
              description="出欠回答を登録・更新します。AVAILABLE / UNAVAILABLE / MAYBE のいずれか。"
            >
              <Box variant="code">
                {`// リクエスト
{
  "response": "AVAILABLE",          // AVAILABLE | UNAVAILABLE | MAYBE
  "channel": "LINE"                 // APP | LINE | EMAIL | WEB
}`}
              </Box>
            </Endpoint>
          </SpaceBetween>
        </Container>

        {/* Helper endpoints */}
        <Container header={<Header variant="h2">助っ人 (Helpers)</Header>}>
          <SpaceBetween size="m">
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
              <Box variant="code">
                {`// リクエスト
{
  "helper_ids": ["uuid-1", "uuid-2"],
  "message": "4/12の試合、助っ人お願いできますか？",  // optional
  "actor_id": "user-uuid"
}`}
              </Box>
            </Endpoint>

            <Endpoint
              method="PATCH"
              path="/api/helper-requests/{id}"
              description="助っ人打診の回答を更新します。充足時は未回答の打診を自動キャンセルします。"
            >
              <Box variant="code">
                {`// リクエスト
{
  "status": "ACCEPTED"  // ACCEPTED | DECLINED | CANCELLED
}`}
              </Box>
            </Endpoint>
          </SpaceBetween>
        </Container>

        {/* Negotiation endpoints */}
        <Container
          header={<Header variant="h2">対戦交渉 (Negotiations)</Header>}
        >
          <SpaceBetween size="m">
            <Endpoint
              method="POST"
              path="/api/games/{id}/negotiations"
              description="相手チームとの対戦交渉を開始します。候補日を提示して交渉を作成します。"
            >
              <Box variant="code">
                {`// リクエスト
{
  "opponent_team_id": "uuid",
  "proposed_dates": ["2026-04-12", "2026-04-19"],
  "message": "4月に練習試合をお願いできますか？",  // optional
  "actor_id": "user-uuid"
}`}
              </Box>
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
              <Box variant="code">
                {`// リクエスト
{
  "status": "ACCEPTED",           // SENT | REPLIED | ACCEPTED | DECLINED | CANCELLED
  "reply_message": "4/12で承りました",  // optional
  "cancel_reason": null           // optional
}`}
              </Box>
            </Endpoint>
          </SpaceBetween>
        </Container>

        {/* Settlement endpoints */}
        <Container header={<Header variant="h2">精算 (Settlement)</Header>}>
          <SpaceBetween size="m">
            <Endpoint
              method="POST"
              path="/api/games/{id}/expenses"
              description="試合の費用を登録します。グラウンド代・審判代・ボール代などを追加します。"
            >
              <Box variant="code">
                {`// リクエスト
{
  "category": "GROUND",           // GROUND | UMPIRE | BALL | DRINK | TOURNAMENT_FEE | OTHER
  "amount": 5000,                 // 金額 (円)
  "paid_by": "member-uuid",       // 立替者 (optional)
  "split_with_opponent": true,    // 相手チームと折半 (default: false)
  "note": "グラウンド使用料"       // optional
}`}
              </Box>
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
              <Box variant="code">
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
              </Box>
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
          </SpaceBetween>
        </Container>

        {/* Results endpoints */}
        <Container header={<Header variant="h2">試合結果 (Results)</Header>}>
          <Endpoint
            method="POST"
            path="/api/games/{id}/results"
            description="試合結果を記録します。スコア、打撃成績、投手成績を登録します。"
          >
            <Box variant="code">
              {`// リクエスト
{
  "our_score": 5,
  "opponent_score": 3,
  "innings": 7,
  "note": "好ゲーム"
}`}
            </Box>
          </Endpoint>
        </Container>

        {/* Team endpoints */}
        <Container header={<Header variant="h2">チーム (Teams)</Header>}>
          <SpaceBetween size="m">
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
              <Box variant="code">
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
              </Box>
            </Endpoint>
          </SpaceBetween>
        </Container>

        {/* Notification endpoints */}
        <Container header={<Header variant="h2">通知 (Notifications)</Header>}>
          <SpaceBetween size="m">
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
          </SpaceBetween>
        </Container>

        {/* AI endpoints */}
        <Container header={<Header variant="h2">AI 機能</Header>}>
          <SpaceBetween size="m">
            <Endpoint
              method="POST"
              path="/api/ai/predict-attendance"
              description="メンバーの出欠を予測します。過去の出席率・曜日・天候などを考慮します。"
            >
              <Box variant="code">
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
              </Box>
            </Endpoint>

            <Endpoint
              method="POST"
              path="/api/ai/recommend-helpers"
              description="試合に適した助っ人を推薦します。信頼度・過去実績・ポジション適性を考慮します。"
            >
              <Box variant="code">
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
              </Box>
            </Endpoint>

            <Endpoint
              method="POST"
              path="/api/ai/generate-message"
              description="対戦交渉用のメッセージを AI が生成します。相手チーム情報・候補日を考慮します。"
            >
              <Box variant="code">
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
              </Box>
            </Endpoint>

            <Endpoint
              method="POST"
              path="/api/ai/weekly-report"
              description="チームの週次レポートを生成します。今週の試合予定・出欠状況・ToDo をまとめます。"
            >
              <Box variant="code">
                {`// リクエスト
{ "team_id": "uuid" }

// レスポンス
{
  "data": {
    "report": "## 今週のサマリー\\n- 4/12 vs 横国さん: 出欠回収中 (7/15)..."
  }
}`}
              </Box>
            </Endpoint>
          </SpaceBetween>
        </Container>

        {/* LIFF endpoints */}
        <Container header={<Header variant="h2">LIFF (LINE連携)</Header>}>
          <SpaceBetween size="s">
            <Box variant="p">
              LINE LIFF アプリ向けのエンドポイントです。LINE
              のアクセストークンで認証します。
            </Box>
            <SpaceBetween size="m">
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
            </SpaceBetween>
          </SpaceBetween>
        </Container>

        {/* Cron endpoints */}
        <Container header={<Header variant="h2">Cron ジョブ</Header>}>
          <SpaceBetween size="s">
            <Box variant="p">
              定期実行されるバックグラウンド処理です。
              <Box variant="code" display="inline">
                CRON_SECRET
              </Box>{" "}
              ヘッダーによる認証が必要です。
            </Box>
            <SpaceBetween size="m">
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
            </SpaceBetween>
          </SpaceBetween>
        </Container>

        {/* Grounds endpoints */}
        <Container header={<Header variant="h2">グラウンド (Grounds)</Header>}>
          <SpaceBetween size="m">
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
          </SpaceBetween>
        </Container>
      </SpaceBetween>
    </ContentLayout>
  );
}
