# エージェントプロトコル設計書

## 目的

このシステムの一級市民は **AI エージェント** である。
代表は Claude Code 経由で操作し、将来は相手チームのエージェントと自動交渉する。

**設計原則:**
1. 全操作は MCP ツール経由で実行可能
2. レスポンスは AI が次のアクションを判断できる構造
3. エージェント間交渉は標準化されたプロトコルで行う
4. 人間は最終承認のみ（Governor が暴走を防ぐ）

---

## 1. Remote MCP サーバー

### 1.1 なぜ MCP か

| 方式 | メリット | デメリット |
|------|---------|-----------|
| REST API 直接 | 汎用的 | エージェントが API 仕様を理解する必要がある |
| OpenAPI + LLM | 自動生成可能 | ツール呼び出しの粒度がバラバラ |
| **MCP** | エージェントがネイティブにツールとして使える | Claude 限定（将来は標準化） |

Claude Code がこのシステムを「ツール」として直接使える。
代表は「試合を組んで」と言うだけで、エージェントが MCP ツールを呼び出す。

### 1.2 ツール一覧

エージェントが呼び出せるツール。**試合成立ループ** に必要な操作を網羅する。

#### 試合ライフサイクル

| ツール名 | 説明 | 入力 | 出力 |
|---------|------|------|------|
| `create_game` | 試合を作成する | title, game_type, game_date, ... | Game オブジェクト |
| `get_game` | 試合の詳細を取得する | game_id | Game + rsvps集計 + 次のアクション候補 |
| `list_games` | チームの試合一覧を取得する | team_id, status?, limit? | Game[] + next_cursor |
| `transition_game` | 試合の状態を遷移させる | game_id, new_status | Game (更新後) + 遷移結果 |
| `validate_game` | 試合の成立可能性を検証する | game_id | canAssess/canArrange/canConfirm の結果 + 推奨アクション |

#### 出欠管理

| ツール名 | 説明 | 入力 | 出力 |
|---------|------|------|------|
| `request_rsvps` | 全メンバーに出欠を依頼する | game_id | 作成数 + メンバー数 |
| `get_rsvps` | 出欠状況を取得する | game_id | RSVP[] + 集計 (available/unavailable/maybe/no_response) |
| `respond_rsvp` | 出欠に回答する | rsvp_id, response, channel? | RSVP (更新後) |

#### 助っ人管理

| ツール名 | 説明 | 入力 | 出力 |
|---------|------|------|------|
| `list_helpers` | 助っ人候補一覧を取得する | team_id | Helper[] (信頼度順) |
| `create_helper_requests` | 助っ人に打診する | game_id, helper_ids[], message? | HelperRequest[] |
| `respond_helper_request` | 助っ人打診に回答する | helper_request_id, status | HelperRequest + 充足状況 |
| `check_fulfillment` | 助っ人充足を判定する | game_id | fulfilled?, total, needed, toCancel[] |

#### 対戦交渉

| ツール名 | 説明 | 入力 | 出力 |
|---------|------|------|------|
| `list_opponent_teams` | 対戦候補チーム一覧を取得する | team_id | OpponentTeam[] |
| `create_negotiation` | 対戦交渉を開始する | game_id, opponent_team_id, proposed_dates[], message? | Negotiation |
| `update_negotiation` | 交渉状態を更新する | negotiation_id, status, reply_message? | Negotiation |
| `list_negotiations` | 交渉一覧を取得する | game_id | Negotiation[] + opponent_teams |

#### 精算

| ツール名 | 説明 | 入力 | 出力 |
|---------|------|------|------|
| `add_expense` | 支出を登録する | game_id, category, amount, ... | Expense |
| `calculate_settlement` | 精算を計算する | game_id | Settlement (total, per_member) |
| `list_expenses` | 支出一覧を取得する | game_id | Expense[] |

#### チーム管理

| ツール名 | 説明 | 入力 | 出力 |
|---------|------|------|------|
| `get_team` | チーム情報を取得する | team_id | Team + 設定 |
| `list_members` | メンバー一覧を取得する | team_id | Member[] (出席率付き) |

### 1.3 AI フレンドリーなレスポンス設計

全てのレスポンスに **`next_actions`** フィールドを含める。
エージェントが「次に何をすべきか」を自律的に判断できる。

```json
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
    },
    {
      "action": "create_helper_requests",
      "reason": "現在7人。最低9人必要。助っ人2人の打診を推奨",
      "priority": "medium",
      "suggested_params": {
        "helper_ids": ["helper-1", "helper-2"],
        "message": "4/12の試合、助っ人お願いできますか？"
      }
    },
    {
      "action": "transition_game",
      "reason": "締切が到来しています。ASSESSINGに進めてください",
      "priority": "high",
      "suggested_params": {
        "new_status": "ASSESSING"
      }
    }
  ]
}
```

### 1.4 エラーレスポンス

エラーにも `next_actions` を含める。

```json
{
  "error": "状態遷移が不正です: DRAFT → CONFIRMED",
  "error_code": "INVALID_TRANSITION",
  "current_status": "DRAFT",
  "available_transitions": ["COLLECTING", "CONFIRMED", "CANCELLED"],
  "next_actions": [
    {
      "action": "transition_game",
      "reason": "まず COLLECTING に遷移して出欠を集めてください",
      "suggested_params": { "new_status": "COLLECTING" }
    }
  ]
}
```

---

## 2. エージェント間交渉プロトコル

### 2.1 概要

将来、チームAのエージェントとチームBのエージェントが自動で対戦交渉する。
そのためのプロトコルを今から定義しておく。

```
チームA エージェント                  システム                   チームB エージェント
       |                               |                              |
       |-- propose_match ------------->|                              |
       |                               |-- notify_proposal ---------->|
       |                               |                              |
       |                               |<-- respond_proposal ---------|
       |<-- proposal_result -----------|                              |
       |                               |                              |
       |-- confirm_match ------------->|                              |
       |                               |-- notify_confirmation ------>|
```

### 2.2 交渉ポリシー

各チームが交渉ポリシーを持つ。エージェントはこのポリシーに基づいて自動判断する。

```json
{
  "team_id": "team-b",
  "policy": {
    "auto_accept": true,
    "preferred_days": ["SATURDAY", "SUNDAY"],
    "preferred_time_slots": ["MORNING"],
    "max_travel_minutes": 30,
    "cost_split": "HALF",
    "min_notice_days": 14,
    "blackout_dates": ["2026-05-03", "2026-05-04", "2026-05-05"],
    "auto_decline_reasons": ["HOLIDAY", "CONSECUTIVE"]
  }
}
```

### 2.3 MCP ツール（エージェント間交渉用）

| ツール名 | 呼び出し元 | 説明 |
|---------|-----------|------|
| `propose_match` | チームA | 対戦を提案する（日程・場所・条件） |
| `respond_to_proposal` | チームB | 提案に回答する（承諾/辞退/逆提案） |
| `get_my_policy` | 各チーム | 自チームの交渉ポリシーを取得する |
| `update_my_policy` | 各チーム | 交渉ポリシーを更新する |
| `list_incoming_proposals` | 各チーム | 受信した対戦提案一覧を取得する |
| `list_available_opponents` | 各チーム | 対戦可能なチーム一覧（ポリシーマッチ済み） |

### 2.4 自動交渉フロー

```
1. チームA エージェント: list_available_opponents
   → ポリシーがマッチするチーム一覧を取得

2. チームA エージェント: propose_match
   → チームBに「4/12 9:00-12:00 八部公園」を提案

3. システム: チームBのポリシーと照合
   - auto_accept = true
   - preferred_days に SATURDAY を含む ✅
   - preferred_time_slots に MORNING を含む ✅
   - max_travel_minutes: 八部公園はチームBのホームから20分 ✅
   - min_notice_days: 14日以上先 ✅
   → 自動承諾

4. チームA エージェント: 承諾通知を受信
   → confirm_match で確定

5. チームB エージェント: 確定通知を受信
   → 自チームの出欠収集を開始
```

### 2.5 Phase 別の実装

| Phase | 内容 |
|-------|------|
| Phase 1 (現在) | 代表が Claude Code で手動操作。MCP ツール経由 |
| Phase 2 | 代表が交渉ポリシーを設定。システムが候補チームを提示 |
| Phase 3 | 相手チームに招待リンク送付。相手もシステムに登録 |
| Phase 4 | 半自動交渉。ポリシーマッチ → 提案自動生成 → 人間承認 |
| Phase 5 | 完全自動交渉。auto_accept=true のチーム同士は即成立 |

---

## 3. Cron ジョブ設計

試合成立ループを自動で回すためのバックグラウンド処理。

### 3.1 ジョブ一覧

| ジョブ | 実行間隔 | 処理内容 |
|-------|---------|----------|
| `process-deadlines` | 毎時 | rsvp_deadline 到来 → 未回答を NO_RESPONSE 確定 → ASSESSING に自動遷移 |
| `send-reminders` | 毎時 | deadline - 24h/48h/72h のゲームを検出 → 未回答メンバーにリマインド |
| `check-fulfillment` | イベント駆動 | helper_request の承諾時 → 充足判定 → PENDING を自動キャンセル |
| `calculate-settlements` | 日次 | COMPLETED 状態の試合 → expenses 集計 → settlement 自動作成 |

### 3.2 process-deadlines の詳細

```
入力: なし (Cron トリガー)
処理:
  1. COLLECTING 状態 かつ rsvp_deadline <= now() のゲームを取得
  2. 各ゲームの rsvps で response = 'NO_RESPONSE' のレコードを確定
  3. games.status を ASSESSING に遷移
  4. audit_logs に記録
  5. 代表に通知 (notification_logs)
```

### 3.3 send-reminders の詳細

```
入力: なし (Cron トリガー)
処理:
  1. COLLECTING 状態のゲームを取得
  2. 各ゲームについて:
     - now() >= rsvp_deadline - 72h → 1回目リマインド
     - now() >= rsvp_deadline - 48h → 2回目リマインド (個別メンション)
     - now() >= rsvp_deadline - 24h → 最終リマインド (警告)
  3. notification_logs で既送信を除外 (重複防止)
  4. 未回答メンバーにプッシュ/メール送信
  5. notification_logs に記録
```

### 3.4 check-fulfillment の詳細

```
入力: game_id (helper_request 承諾時にトリガー)
処理:
  1. game の AVAILABLE メンバー数を取得
  2. ACCEPTED の助っ人数を取得
  3. total >= min_players なら充足
  4. PENDING の helper_requests を CANCELLED に更新 (cancel_reason = 'FULFILLED')
  5. キャンセルされた助っ人に通知
  6. 代表に「人数が揃いました」通知
```

---

## 4. API 設計方針

### 4.1 レスポンス構造の統一

全エンドポイントが同じ構造を返す。

```typescript
interface ApiResponse<T> {
  data: T;
  meta?: {
    total?: number;
    next_cursor?: string;
    [key: string]: unknown;
  };
  next_actions: NextAction[];
}

interface NextAction {
  action: string;       // MCP ツール名
  reason: string;       // なぜこのアクションを推奨するか
  priority: "high" | "medium" | "low";
  suggested_params?: Record<string, unknown>;
}

interface ApiError {
  error: string;
  error_code: string;
  next_actions: NextAction[];
  [key: string]: unknown; // コンテキスト情報
}
```

### 4.2 エンドポイント設計

**REST API** と **MCP ツール** は同じバックエンドロジックを共有する。

```
REST API (Web UI / 外部連携用)      MCP Server (エージェント用)
  POST /api/games                    create_game
  GET  /api/games/:id                get_game
  POST /api/games/:id/transition     transition_game
  POST /api/games/:id/rsvps          request_rsvps
  PATCH /api/rsvps/:id               respond_rsvp
  POST /api/games/:id/helper-requests  create_helper_requests
  ...                                ...
```

MCP サーバーは REST API のラッパーとして実装する。
ビジネスロジックは `packages/core` に集約されており、どちらからも呼べる。

---

## 5. 実装順序

目的: **試合1件が成立するまでのフルループを動かす**

### Step 1: API 基盤の AI フレンドリー化
- `next_actions` 付きレスポンスヘルパーを `packages/core` に追加
- 既存 API Routes のレスポンスを統一フォーマットに変更

### Step 2: 残り API の実装
- `POST /api/games/:id/helper-requests` — 助っ人打診作成
- `POST /api/games/:id/negotiations` — 対戦交渉作成
- `PATCH /api/negotiations/:id` — 交渉状態遷移
- `POST /api/games/:id/expenses` — 支出登録
- `POST /api/games/:id/settlement` — 精算計算

### Step 3: Cron エンドポイント
- `POST /api/cron/process-deadlines`
- `POST /api/cron/send-reminders`
- `POST /api/cron/check-fulfillment`

### Step 4: MCP サーバー定義
- `packages/mcp/` に Remote MCP サーバーを実装
- 全ツールを定義
- Claude Code から接続テスト

### Step 5: エージェント間交渉の基盤
- `teams.settings_json` に交渉ポリシーを格納
- `propose_match` / `respond_to_proposal` ツールの実装
- ポリシーマッチングロジック

---

## 6. まとめ

```
現在:   代表 → Claude Code → MCP → システム → DB
Phase4: 代表 → Claude Code → MCP → システム → 相手チームのMCP → 相手のエージェント
Phase5: エージェントA → MCP → システム → MCP → エージェントB （人間は承認のみ）
```

API は最初から「エージェントが使うもの」として設計する。
UI は「エージェントの判断を人間が確認・承認するためのダッシュボード」。
MCP は「エージェントがシステムと対話するためのインターフェース」。
