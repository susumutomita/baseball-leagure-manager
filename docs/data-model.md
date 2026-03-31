# データモデル設計書

草野球チーム運営支援システムのデータモデル。
`docs/operations-reality.md` のインタビュー結果と `docs/architecture.md` のドメイン境界に基づく。

---

## 設計原則

1. **代表一人で回る** — role/permissionは最小限。代表=owner、それ以外は回答するだけ
2. **メンバーに何も覚えさせない** — メンバーのデータは代表が登録。メンバー自身のアカウント作成不要
3. **試合と練習を区別する** — 試合は出欠厳密管理、練習はゆるい
4. **過去実績を蓄積する** — 出席率・ドタキャン率で予測精度を上げる
5. **打診→回答→充足→キャンセルのフロー**を追跡する（助っ人・対戦相手共通）

---

## 1. チーム管理コンテキスト

### teams（チーム）

代表が管理するチーム。1人の代表が1チームを管理する前提（Phase 1）。

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID PK | |
| name | TEXT NOT NULL | チーム名 |
| home_area | TEXT NOT NULL | 活動エリア（例: 横浜市・藤沢市） |
| activity_day | TEXT | 通常活動曜日（例: 土曜午前） |
| owner_user_id | UUID | Supabase Auth ユーザーID（代表） |
| settings_json | JSONB | チーム設定（リマインド間隔、締切日数等） |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

### members（メンバー）

チームの正規メンバー。代表が登録する。

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID PK | |
| team_id | UUID FK → teams | 所属チーム |
| name | TEXT NOT NULL | 表示名（ニックネーム可） |
| tier | TEXT NOT NULL | `PRO` / `LITE` |
| line_user_id | TEXT | LINE連携用（プッシュ通知・出欠回答） |
| email | TEXT | メール通知用（LINEフォールバック） |
| expo_push_token | TEXT | アプリプッシュ通知用 |
| positions_json | JSONB | 守備ポジション希望（配列） |
| jersey_number | INTEGER | 背番号（0-99） |
| attendance_rate | NUMERIC(5,2) | 出席率（自動計算、蓄積） |
| no_show_rate | NUMERIC(5,2) | ドタキャン率（参加回答→不参加の割合） |
| status | TEXT NOT NULL | `ACTIVE` / `INACTIVE` / `PENDING` |
| joined_at | DATE | 入部日 |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**現行からの変更:**
- `contact_type` / `contact_value` → `line_user_id` / `email` / `expo_push_token` に分離（通知チャネル別）
- `tier` 追加（PRO / LITE のメンバー区分）
- `no_show_rate` 追加（ドタキャン率）
- `jersey_number` 追加（背番号管理）
- `level_band` 削除（チームレベルはteamsに持つ。個人レベルは不要）

### helpers（助っ人候補）

チーム外の個人。複数チームから参照されうるが、Phase 1ではチーム単位で管理。

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID PK | |
| team_id | UUID FK → teams | 登録したチーム |
| name | TEXT NOT NULL | 名前 |
| line_user_id | TEXT | LINE連絡先 |
| email | TEXT | メール連絡先 |
| note | TEXT | メモ（「左投げ」「キャッチャーできる」等） |
| times_helped | INTEGER DEFAULT 0 | 過去に助っ人として来た回数 |
| last_helped_at | DATE | 最後に来てくれた日 |
| reliability_score | NUMERIC(3,2) | 信頼度（OK回答→実際に来た率） |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**新規テーブル。** 現行スキーマには助っ人の概念がなかった。

---

## 2. 試合管理コンテキスト

### games（試合/練習）

現行の `match_requests` を置き換える。「試合希望」ではなく「イベント」が実態。

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID PK | |
| team_id | UUID FK → teams | |
| title | TEXT NOT NULL | 例: 「4/5 vs 横国さん」「4/12 練習」 |
| game_type | TEXT NOT NULL | `PRACTICE` / `FRIENDLY` / `LEAGUE` / `TOURNAMENT` |
| status | TEXT NOT NULL | 後述の状態遷移参照 |
| game_date | DATE | 試合日（確定後） |
| start_time | TIME | 開始時刻 |
| end_time | TIME | 終了時刻 |
| ground_id | UUID FK → grounds | 使用グラウンド（確定後） |
| ground_name | TEXT | グラウンド名（ground_id未設定時の手入力用） |
| opponent_team_id | UUID FK → opponent_teams | 対戦相手（確定後） |
| min_players | INTEGER DEFAULT 9 | 成立最低人数 |
| rsvp_deadline | TIMESTAMPTZ | 出欠回答締切（デフォルト: 4週間前） |
| note | TEXT | メモ |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**現行からの変更:**
- `match_requests` → `games` にリネーム
- `game_type` 追加（PRACTICE / FRIENDLY / LEAGUE / TOURNAMENT）
- `game_date` / `start_time` / `end_time` を正規カラムに（JSONBから移行）
- `ground_id` FK追加
- `opponent_team_id` FK追加
- `rsvp_deadline` 追加（出欠締切）
- AI関連カラム（`confidence_score`, `review_required`）削除 → AI判断はClaude Codeで実行
- `desired_dates_json` / `preferred_time_slots_json` 削除 → `available_dates`テーブルに分離

### games の状態遷移

```
DRAFT（下書き）
  ↓ 代表が公開
COLLECTING（出欠収集中）
  ↓ 締切到来 or 代表が締切
ASSESSING（人数判定）
  ↓ 人数OK
ARRANGING（手配中: 相手・グラウンド・審判）
  ↓ 全て確定
CONFIRMED（確定）
  ↓ 試合実施
COMPLETED（完了: 参加実績記録済み）
  ↓ 精算完了
SETTLED（精算済み）

分岐:
  COLLECTING → CANCELLED
  ASSESSING  → CANCELLED（人数不足で中止）
  ARRANGING  → CANCELLED（相手見つからず等）
  CONFIRMED  → CANCELLED（雨天中止等）
```

注: `PRACTICE` タイプの場合は DRAFT → CONFIRMED → COMPLETED の簡略フロー。

### rsvps（出欠回答）

現行の `availability_responses` を置き換える。事前回答と当日実績を分離。

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID PK | |
| game_id | UUID FK → games | |
| member_id | UUID FK → members | |
| response | TEXT NOT NULL | `AVAILABLE` / `UNAVAILABLE` / `MAYBE` / `NO_RESPONSE` |
| responded_at | TIMESTAMPTZ | 回答日時 |
| response_channel | TEXT | `APP` / `LINE` / `EMAIL` / `WEB`（どこから回答したか） |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |
| UNIQUE (game_id, member_id) | | upsertパターン |

### attendances（当日参加実績）

**新規テーブル。** 出欠回答(rsvp)と当日実績を分離する。精算の基礎データ。

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID PK | |
| game_id | UUID FK → games | |
| person_type | TEXT NOT NULL | `MEMBER` / `HELPER` |
| person_id | UUID NOT NULL | member_id or helper_id |
| status | TEXT NOT NULL | `ATTENDED` / `NO_SHOW` / `CANCELLED_SAME_DAY` |
| recorded_at | TIMESTAMPTZ | 記録日時 |
| recorded_by | UUID | 記録した人（通常は代表） |
| UNIQUE (game_id, person_type, person_id) | | |

---

## 3. 助っ人打診コンテキスト

### helper_requests（助っ人打診）

**新規テーブル。** 助っ人への打診→回答→充足→キャンセルを追跡。

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID PK | |
| game_id | UUID FK → games | どの試合向けの打診か |
| helper_id | UUID FK → helpers | 打診先 |
| status | TEXT NOT NULL | `PENDING` / `ACCEPTED` / `DECLINED` / `CANCELLED` |
| message | TEXT | 打診メッセージ |
| sent_at | TIMESTAMPTZ | 送信日時 |
| responded_at | TIMESTAMPTZ | 回答日時 |
| cancelled_at | TIMESTAMPTZ | キャンセル日時（充足後の自動キャンセル） |
| cancel_reason | TEXT | キャンセル理由（`FULFILLED` / `GAME_CANCELLED` 等） |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**自動キャンセルのフロー:**
```
game.min_players = 9
参加確定メンバー = 7人
助っ人打診: A(PENDING), B(ACCEPTED), C(PENDING)

→ 7 + B(1) = 8人。あと1人
→ AがACCEPTED → 7 + 2 = 9人。充足！
→ Cを自動的に CANCELLED (cancel_reason = 'FULFILLED') に更新
→ Cに「今回は人数揃いました。ありがとうございます」を自動通知
```

---

## 4. 対戦相手管理コンテキスト

### opponent_teams（対戦相手チーム）

現行テーブルを拡張。

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID PK | |
| team_id | UUID FK → teams | 登録したチーム |
| name | TEXT NOT NULL | チーム名 |
| area | TEXT | 活動エリア |
| contact_name | TEXT | 相手の代表名 |
| contact_email | TEXT | メールアドレス |
| contact_line | TEXT | LINE |
| contact_phone | TEXT | 電話番号 |
| home_ground | TEXT | ホームグラウンド名 |
| note | TEXT | メモ（「強い」「初心者多め」「審判付き希望」等） |
| times_played | INTEGER DEFAULT 0 | 過去の対戦回数 |
| last_played_at | DATE | 最後に対戦した日 |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**現行からの変更:**
- `level_band` 削除（主観的すぎる。noteで十分）
- `contact_channel` → `contact_email` / `contact_line` / `contact_phone` に分離
- `contact_name` 追加（相手代表の名前）
- `home_ground` 追加（相手のホームグラウンド情報）
- `times_played` / `last_played_at` 追加（対戦実績）
- `team_id` FK追加（どのチームが登録したか）

### negotiations（対戦交渉）

現行テーブルを拡張。日程調整のステータスを追跡。

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID PK | |
| game_id | UUID FK → games | どの試合向けの交渉か |
| opponent_team_id | UUID FK → opponent_teams | 交渉相手 |
| status | TEXT NOT NULL | `DRAFT` / `SENT` / `REPLIED` / `ACCEPTED` / `DECLINED` / `CANCELLED` |
| proposed_dates_json | JSONB | こちらが提案した日程（配列） |
| message_sent | TEXT | 送信したメッセージ |
| reply_received | TEXT | 受信した返答 |
| sent_at | TIMESTAMPTZ | 送信日時 |
| replied_at | TIMESTAMPTZ | 返答受信日時 |
| cancelled_at | TIMESTAMPTZ | キャンセル日時 |
| cancel_reason | TEXT | `DATE_TAKEN` / `GAME_CANCELLED` 等 |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**現行からの変更:**
- `match_request_id` → `game_id` にリネーム
- `cancelled_at` / `cancel_reason` 追加（日程確定後の他チームへの自動キャンセル通知）
- `sent_at` / `replied_at` 追加（タイムライン追跡）

**日程確定時の自動キャンセル:**
```
4/12の試合:
  Xチームに打診(SENT) → 未回答
  Yチームに打診(SENT) → ACCEPTED
  → 4/12確定
  → Xチームを自動 CANCELLED (cancel_reason = 'DATE_TAKEN')
  → Xチームに「4/12は決まりました」を通知
```

### available_dates（チームの空き日程）

**新規テーブル。** 対戦相手との調整時に「こちらの空き」を管理。

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID PK | |
| team_id | UUID FK → teams | |
| date | DATE NOT NULL | 空いている日 |
| time_slot | TEXT | `MORNING` / `AFTERNOON` / `ALL_DAY` |
| status | TEXT NOT NULL | `AVAILABLE` / `PROPOSED` / `BOOKED` |
| game_id | UUID FK → games | この日が確定した試合（BOOKED時） |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |
| UNIQUE (team_id, date, time_slot) | | |

**フロー:**
```
代表が空き日を登録: 4/5(AM), 4/12(AM), 4/19(AM) → status = AVAILABLE
Xチームに4/5, 4/12を提案 → status = PROPOSED
Yチームが4/12をACCEPT → status = BOOKED, game_id設定
→ 4/12がPROPOSED状態の他の交渉にも反映（「4/12は埋まりました」）
```

---

## 5. グラウンド管理コンテキスト

### grounds（グラウンド）

現行の `ground_watch_targets` を拡張。監視対象であり予約先でもある。

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID PK | |
| team_id | UUID FK → teams | 登録したチーム |
| name | TEXT NOT NULL | 球場名（例: 八部公園野球場） |
| municipality | TEXT NOT NULL | 自治体（横浜市/藤沢市/平塚市/鎌倉市/神奈川県/綾瀬市） |
| source_url | TEXT | 予約システムURL |
| cost_per_slot | INTEGER | 1枠あたりの料金 |
| is_hardball_ok | BOOLEAN DEFAULT false | 硬式野球可能か |
| has_night_lights | BOOLEAN DEFAULT false | ナイター設備 |
| note | TEXT | メモ（「駐車場あり」「アクセス悪い」等） |
| watch_active | BOOLEAN DEFAULT true | 空き監視が有効か |
| conditions_json | JSONB | 監視条件（曜日、時間帯等） |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**現行からの変更:**
- `ground_watch_targets` → `grounds` にリネーム
- `municipality` 追加（自治体別の抽選ルール管理の起点）
- `cost_per_slot` 追加（精算計算に使用）
- `is_hardball_ok` / `has_night_lights` 追加（横浜市の優先グラウンド判断に使用）

### ground_slots（グラウンド空き情報）

現行の `ground_availability_snapshots` を置き換え。スナップショットではなくスロット単位で管理。

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID PK | |
| ground_id | UUID FK → grounds | |
| date | DATE NOT NULL | |
| time_slot | TEXT NOT NULL | `MORNING` / `AFTERNOON` / `EVENING` |
| status | TEXT NOT NULL | `AVAILABLE` / `RESERVED` / `UNAVAILABLE` |
| detected_at | TIMESTAMPTZ | 空きを検出した日時 |
| reserved_game_id | UUID FK → games | 予約した試合（RESERVED時） |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |
| UNIQUE (ground_id, date, time_slot) | | |

---

## 6. 精算コンテキスト

### expenses（費用）

**新規テーブル。** 試合/練習にかかった費用を記録。

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID PK | |
| game_id | UUID FK → games | |
| category | TEXT NOT NULL | `GROUND` / `UMPIRE` / `BALL` / `DRINK` / `TOURNAMENT_FEE` / `OTHER` |
| amount | INTEGER NOT NULL | 金額（円） |
| paid_by | UUID FK → members | 立替した人 |
| split_with_opponent | BOOLEAN DEFAULT false | 対戦相手と折半するか |
| note | TEXT | メモ |
| created_at | TIMESTAMPTZ | |

### settlements（精算サマリー）

**新規テーブル。** 試合単位の精算結果。

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID PK | |
| game_id | UUID FK → games | UNIQUE |
| total_cost | INTEGER NOT NULL | 総費用 |
| opponent_share | INTEGER DEFAULT 0 | 対戦相手負担分 |
| team_cost | INTEGER NOT NULL | チーム負担分 (total - opponent_share) |
| member_count | INTEGER NOT NULL | 負担するメンバー数（助っ人除く） |
| per_member | INTEGER NOT NULL | 一人あたり金額 |
| status | TEXT NOT NULL | `DRAFT` / `NOTIFIED` / `SETTLED` |
| settled_at | TIMESTAMPTZ | 精算完了日時 |
| created_at | TIMESTAMPTZ | |
| updated_at | TIMESTAMPTZ | |

**注:** 最終的なPayPay送金は手動。システムは金額算出と通知まで。

---

## 7. 通知コンテキスト

### notification_logs（通知履歴）

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID PK | |
| team_id | UUID FK → teams | |
| game_id | UUID FK → games | 関連する試合（あれば） |
| recipient_type | TEXT NOT NULL | `MEMBER` / `HELPER` / `OPPONENT` |
| recipient_id | UUID NOT NULL | 宛先のID |
| channel | TEXT NOT NULL | `PUSH` / `LINE` / `EMAIL` |
| notification_type | TEXT NOT NULL | `RSVP_REQUEST` / `REMINDER` / `DEADLINE` / `HELPER_REQUEST` / `SETTLEMENT` / `CANCELLATION` / `GROUND_ALERT` |
| content | TEXT | 通知内容 |
| sent_at | TIMESTAMPTZ | |
| delivered | BOOLEAN | 配信成功したか |

---

## 8. 監査ログ

### audit_logs（監査ログ）

現行テーブルをそのまま使用。

| カラム | 型 | 説明 |
|--------|-----|------|
| id | UUID PK | |
| actor_type | TEXT NOT NULL | `USER` / `SYSTEM` / `AI` |
| actor_id | TEXT NOT NULL | |
| action | TEXT NOT NULL | |
| target_type | TEXT NOT NULL | |
| target_id | TEXT NOT NULL | |
| before_json | JSONB | |
| after_json | JSONB | |
| created_at | TIMESTAMPTZ | |

---

## ER図（テキスト）

```
teams
  │
  ├──< members          (1:N) チーム→メンバー
  ├──< helpers           (1:N) チーム→助っ人候補
  ├──< opponent_teams    (1:N) チーム→対戦相手
  ├──< grounds           (1:N) チーム→グラウンド
  ├──< games             (1:N) チーム→試合
  └──< available_dates   (1:N) チーム→空き日程
        │
games
  │
  ├──< rsvps             (1:N) 試合→出欠回答
  ├──< attendances       (1:N) 試合→参加実績
  ├──< helper_requests   (1:N) 試合→助っ人打診
  ├──< negotiations      (1:N) 試合→対戦交渉
  ├──< expenses          (1:N) 試合→費用
  ├──1 settlements       (1:1) 試合→精算サマリー
  └──< notification_logs (1:N) 試合→通知履歴

members
  ├──< rsvps             (1:N) メンバー→出欠回答
  ├──< attendances       (1:N) メンバー→参加実績
  └──< expenses.paid_by  (1:N) メンバー→立替記録

helpers
  ├──< helper_requests   (1:N) 助っ人→打診記録
  └──< attendances       (1:N) 助っ人→参加実績

opponent_teams
  └──< negotiations      (1:N) 対戦相手→交渉記録

grounds
  ├──< ground_slots      (1:N) グラウンド→空き情報
  └──< games.ground_id   (1:N) グラウンド→試合
```

---

## 現行スキーマからの移行サマリー

| 現行テーブル | 新テーブル | 変更内容 |
|-------------|-----------|---------|
| teams | teams | owner_user_id, settings_json追加。level_band削除 |
| members | members | tier, line_user_id, expo_push_token, no_show_rate追加 |
| — | **helpers** | **新規** |
| match_requests | **games** | リネーム。game_type, game_date, rsvp_deadline追加 |
| availability_responses | **rsvps** | リネーム。response_channel追加 |
| — | **attendances** | **新規**（当日実績） |
| — | **helper_requests** | **新規**（助っ人打診） |
| opponent_teams | opponent_teams | contact分離、times_played追加 |
| negotiations | negotiations | game_id化、cancelled_at追加 |
| — | **available_dates** | **新規**（空き日程管理） |
| ground_watch_targets | **grounds** | リネーム。municipality, cost追加 |
| ground_availability_snapshots | **ground_slots** | スナップショット→スロット単位に変更 |
| — | **expenses** | **新規** |
| — | **settlements** | **新規** |
| confirmations | **削除** | gamesのstatus遷移に統合 |
| — | **notification_logs** | **新規** |
| audit_logs | audit_logs | 変更なし |
