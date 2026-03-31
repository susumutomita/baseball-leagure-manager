# ER図・DFD（データフロー図）

GitHubで直接レンダリングされます。

---

## 1. ER図（エンティティ関連図）

### 1.1 全体概要

```mermaid
erDiagram
    teams ||--o{ members : "has"
    teams ||--o{ helpers : "has"
    teams ||--o{ opponent_teams : "has"
    teams ||--o{ grounds : "has"
    teams ||--o{ games : "has"
    teams ||--o{ available_dates : "has"

    games ||--o{ rsvps : "has"
    games ||--o{ attendances : "has"
    games ||--o{ helper_requests : "has"
    games ||--o{ negotiations : "has"
    games ||--o{ expenses : "has"
    games ||--o| settlements : "has"
    games ||--o{ notification_logs : "has"
    games ||--o| game_results : "has"
    games ||--o{ at_bats : "has"
    games ||--o{ pitching_stats : "has"
    games ||--o{ fielding_entries : "has"

    members ||--o{ rsvps : "responds"
    members ||--o{ attendances : "attends"
    members ||--o{ at_bats : "bats"
    members ||--o{ pitching_stats : "pitches"
    members ||--o{ fielding_entries : "fields"

    helpers ||--o{ helper_requests : "requested"
    helpers ||--o{ attendances : "attends"

    opponent_teams ||--o{ negotiations : "negotiates"

    grounds ||--o{ ground_slots : "has"
    grounds ||--o{ games : "used_by"
```

### 1.2 チーム管理コンテキスト

```mermaid
erDiagram
    teams {
        uuid id PK
        text name
        text home_area
        text activity_day
        uuid owner_user_id
        jsonb settings_json
        timestamptz created_at
        timestamptz updated_at
    }

    members {
        uuid id PK
        uuid team_id FK
        text name
        text tier "PRO | LITE"
        text line_user_id
        text email
        text expo_push_token
        jsonb positions_json
        int jersey_number
        numeric attendance_rate
        numeric no_show_rate
        text status "ACTIVE | INACTIVE | PENDING"
        date joined_at
    }

    helpers {
        uuid id PK
        uuid team_id FK
        text name
        text line_user_id
        text email
        text note
        int times_helped
        date last_helped_at
        numeric reliability_score
    }

    teams ||--o{ members : "has"
    teams ||--o{ helpers : "has"
```

### 1.3 試合管理コンテキスト

```mermaid
erDiagram
    games {
        uuid id PK
        uuid team_id FK
        text title
        text game_type "PRACTICE | FRIENDLY | LEAGUE | TOURNAMENT"
        text status "DRAFT | COLLECTING | ASSESSING | ARRANGING | CONFIRMED | COMPLETED | SETTLED | CANCELLED"
        date game_date
        time start_time
        time end_time
        uuid ground_id FK
        text ground_name
        uuid opponent_team_id FK
        int min_players
        timestamptz rsvp_deadline
        text note
    }

    rsvps {
        uuid id PK
        uuid game_id FK
        uuid member_id FK
        text response "AVAILABLE | UNAVAILABLE | MAYBE | NO_RESPONSE"
        timestamptz responded_at
        text response_channel "APP | LINE | EMAIL | WEB"
    }

    attendances {
        uuid id PK
        uuid game_id FK
        text person_type "MEMBER | HELPER"
        uuid person_id
        text status "ATTENDED | NO_SHOW | CANCELLED_SAME_DAY"
        timestamptz recorded_at
        uuid recorded_by
    }

    games ||--o{ rsvps : "has"
    games ||--o{ attendances : "has"
    members ||--o{ rsvps : "responds"
```

### 1.4 助っ人打診コンテキスト

```mermaid
erDiagram
    helper_requests {
        uuid id PK
        uuid game_id FK
        uuid helper_id FK
        text status "PENDING | ACCEPTED | DECLINED | CANCELLED"
        text message
        timestamptz sent_at
        timestamptz responded_at
        timestamptz cancelled_at
        text cancel_reason "FULFILLED | GAME_CANCELLED"
    }

    games ||--o{ helper_requests : "needs"
    helpers ||--o{ helper_requests : "requested"
```

### 1.5 対戦交渉コンテキスト

```mermaid
erDiagram
    opponent_teams {
        uuid id PK
        uuid team_id FK
        text name
        text area
        text contact_name
        text contact_email
        text contact_line
        text contact_phone
        text home_ground
        text note
        int times_played
        date last_played_at
    }

    negotiations {
        uuid id PK
        uuid game_id FK
        uuid opponent_team_id FK
        text status "DRAFT | SENT | REPLIED | ACCEPTED | DECLINED | CANCELLED"
        jsonb proposed_dates_json
        text message_sent
        text reply_received
        timestamptz sent_at
        timestamptz replied_at
        timestamptz cancelled_at
        text cancel_reason "DATE_TAKEN | GAME_CANCELLED"
    }

    available_dates {
        uuid id PK
        uuid team_id FK
        date date
        text time_slot "MORNING | AFTERNOON | ALL_DAY"
        text status "AVAILABLE | PROPOSED | BOOKED"
        uuid game_id FK
    }

    opponent_teams ||--o{ negotiations : "negotiates"
    games ||--o{ negotiations : "has"
    teams ||--o{ available_dates : "has"
```

### 1.6 グラウンド管理コンテキスト

```mermaid
erDiagram
    grounds {
        uuid id PK
        uuid team_id FK
        text name
        text municipality "横浜市 | 藤沢市 | 平塚市 | 鎌倉市 | 神奈川県 | 綾瀬市"
        text source_url
        int cost_per_slot
        boolean is_hardball_ok
        boolean has_night_lights
        text note
        boolean watch_active
        jsonb conditions_json
    }

    ground_slots {
        uuid id PK
        uuid ground_id FK
        date date
        text time_slot "MORNING | AFTERNOON | EVENING"
        text status "AVAILABLE | RESERVED | UNAVAILABLE"
        timestamptz detected_at
        uuid reserved_game_id FK
    }

    grounds ||--o{ ground_slots : "has"
```

### 1.7 精算コンテキスト

```mermaid
erDiagram
    expenses {
        uuid id PK
        uuid game_id FK
        text category "GROUND | UMPIRE | BALL | DRINK | TOURNAMENT_FEE | OTHER"
        int amount
        uuid paid_by FK
        boolean split_with_opponent
        text note
    }

    settlements {
        uuid id PK
        uuid game_id FK "UNIQUE"
        int total_cost
        int opponent_share
        int team_cost
        int member_count
        int per_member
        text status "DRAFT | NOTIFIED | SETTLED"
        timestamptz settled_at
    }

    games ||--o{ expenses : "has"
    games ||--o| settlements : "has"
    members ||--o{ expenses : "paid_by"
```

### 1.8 個人成績コンテキスト

```mermaid
erDiagram
    game_results {
        uuid id PK
        uuid game_id FK "UNIQUE"
        int our_score
        int opponent_score
        text result "WIN | LOSE | DRAW"
        int innings
        text note
    }

    at_bats {
        uuid id PK
        uuid game_id FK
        uuid member_id FK
        int inning
        int batting_order
        text result "SINGLE | DOUBLE | TRIPLE | HOMERUN | GROUND_OUT | FLY_OUT | ..."
        text hit_direction "LEFT | LEFT_CENTER | CENTER | RIGHT_CENTER | RIGHT"
        text hit_type "GROUND | FLY | LINE | BUNT"
        int rbi
        boolean runs_scored
        boolean stolen_base
    }

    pitching_stats {
        uuid id PK
        uuid game_id FK
        uuid member_id FK
        text role "STARTER | RELIEVER | CLOSER"
        numeric innings_pitched
        int hits_allowed
        int earned_runs
        int strikeouts
        int walks
        boolean is_winning_pitcher
        boolean is_losing_pitcher
    }

    fielding_entries {
        uuid id PK
        uuid game_id FK
        uuid member_id FK
        text position "P | C | 1B | 2B | 3B | SS | LF | CF | RF"
        int innings_from
        int innings_to
    }

    games ||--o| game_results : "has"
    games ||--o{ at_bats : "has"
    games ||--o{ pitching_stats : "has"
    games ||--o{ fielding_entries : "has"
    members ||--o{ at_bats : "bats"
    members ||--o{ pitching_stats : "pitches"
    members ||--o{ fielding_entries : "fields"
```

---

## 2. DFD（データフロー図）

### 2.1 コンテキスト図（レベル0）

システム全体を1つのプロセスとして表現。

```mermaid
graph TB
    代表["🧑 代表"]
    メンバー["👥 メンバー"]
    助っ人["🤝 助っ人"]
    対戦相手["⚾ 対戦相手チーム"]
    自治体["🏛️ 自治体予約システム"]
    カレンダー["📅 Googleカレンダー / TimeTree"]

    代表 -->|試合作成・設定| システム["⚙️ 草野球運営支援システム"]
    システム -->|状況レポート・提案| 代表

    システム -->|出欠依頼・リマインド| メンバー
    メンバー -->|出欠回答| システム

    システム -->|助っ人打診| 助っ人
    助っ人 -->|OK / NG| システム
    システム -->|キャンセル通知| 助っ人

    代表 -->|打診文面確認| システム
    システム -->|打診メール・LINE| 対戦相手
    対戦相手 -->|返答| 代表

    自治体 -->|空き情報| システム
    システム -->|空き通知| 代表

    システム -->|予定追加| カレンダー
```

### 2.2 レベル1 DFD（主要プロセス分解）

```mermaid
graph TB
    subgraph 外部エンティティ
        代表["🧑 代表"]
        メンバー["👥 メンバー"]
        助っ人候補["🤝 助っ人候補"]
        対戦相手["⚾ 対戦相手"]
        自治体["🏛️ 自治体"]
    end

    subgraph プロセス
        P1["P1: 試合管理"]
        P2["P2: 出欠管理"]
        P3["P3: 助っ人管理"]
        P4["P4: 対戦交渉"]
        P5["P5: グラウンド監視"]
        P6["P6: 精算管理"]
        P7["P7: 通知管理"]
    end

    subgraph データストア
        D1[("D1: games")]
        D2[("D2: rsvps")]
        D3[("D3: helpers / helper_requests")]
        D4[("D4: opponent_teams / negotiations")]
        D5[("D5: grounds / ground_slots")]
        D6[("D6: expenses / settlements")]
        D7[("D7: notification_logs")]
    end

    代表 -->|試合作成| P1
    P1 -->|試合情報| D1
    P1 -->|出欠依頼トリガー| P2
    P1 -->|助っ人必要トリガー| P3

    P2 -->|出欠通知| P7
    P7 -->|プッシュ/メール| メンバー
    メンバー -->|回答| P2
    P2 -->|回答保存| D2
    P2 -->|人数判定結果| P1

    代表 -->|助っ人打診指示| P3
    P3 -->|打診情報| D3
    P3 -->|打診通知| P7
    P7 -->|LINE/メール| 助っ人候補
    助っ人候補 -->|OK/NG| P3
    P3 -->|充足→キャンセル通知| P7

    代表 -->|打診指示| P4
    P4 -->|交渉情報| D4
    P4 -->|日程確定→他チームキャンセル| P7
    対戦相手 -->|返答| 代表
    代表 -->|返答入力| P4

    自治体 -->|空き情報| P5
    P5 -->|スロット情報| D5
    P5 -->|空き通知| P7
    P7 -->|通知| 代表

    P1 -->|試合完了トリガー| P6
    代表 -->|費用入力・人数入力| P6
    P6 -->|精算情報| D6
    P6 -->|精算通知| P7
    P7 -->|金額通知| メンバー

    P7 -->|送信記録| D7
```

### 2.3 レベル2 DFD: P2 出欠管理（詳細）

```mermaid
graph TB
    subgraph 外部
        代表["🧑 代表"]
        メンバー["👥 メンバー"]
        Claude["🤖 Claude Code"]
    end

    subgraph "P2: 出欠管理"
        P2_1["P2.1: 出欠依頼送信"]
        P2_2["P2.2: 回答受付"]
        P2_3["P2.3: リマインド<br>(Cron: 24h/48h/72h)"]
        P2_4["P2.4: 締切処理<br>(Cron: deadline到来)"]
        P2_5["P2.5: 人数判定"]
    end

    subgraph データストア
        D1[("games")]
        D2[("rsvps")]
        D_members[("members")]
        D7[("notification_logs")]
    end

    代表 -->|試合公開| P2_1
    D1 -->|試合情報| P2_1
    D_members -->|メンバー一覧| P2_1
    P2_1 -->|通知送信| D7
    P2_1 -.->|プッシュ/メール| メンバー

    メンバー -->|回答タップ| P2_2
    P2_2 -->|upsert| D2

    D2 -->|未回答者抽出| P2_3
    D1 -->|締切情報| P2_3
    P2_3 -->|リマインド送信| D7
    P2_3 -.->|プッシュ/メール| メンバー

    D1 -->|締切到来| P2_4
    D2 -->|未回答者| P2_4
    P2_4 -->|NO_RESPONSEに更新| D2

    D2 -->|回答集計| P2_5
    D_members -->|attendance_rate| P2_5
    P2_5 -->|判定結果| D1

    代表 -->|予測依頼| Claude
    Claude -->|DB読み取り| D2
    Claude -->|DB読み取り| D_members
    Claude -->|予測レポート| 代表
```

### 2.4 レベル2 DFD: P3 助っ人管理（詳細）

```mermaid
graph TB
    subgraph 外部
        代表["🧑 代表"]
        助っ人["🤝 助っ人"]
        Claude["🤖 Claude Code"]
    end

    subgraph "P3: 助っ人管理"
        P3_1["P3.1: 候補推薦"]
        P3_2["P3.2: 打診送信"]
        P3_3["P3.3: 回答受付"]
        P3_4["P3.4: 充足判定"]
        P3_5["P3.5: 自動キャンセル"]
    end

    subgraph データストア
        D1[("games")]
        D3_h[("helpers")]
        D3_r[("helper_requests")]
        D7[("notification_logs")]
    end

    代表 -->|助っ人探して| Claude
    Claude -->|候補DB参照| D3_h
    Claude -->|推薦リスト| P3_1
    P3_1 -->|候補提示| 代表

    代表 -->|打診OK| P3_2
    P3_2 -->|PENDING作成| D3_r
    P3_2 -->|打診通知| D7
    P3_2 -.->|LINE/メール| 助っ人

    助っ人 -->|OK/NG| P3_3
    P3_3 -->|ステータス更新| D3_r

    D3_r -->|ACCEPTED数集計| P3_4
    D1 -->|必要人数| P3_4
    P3_4 -->|充足判定| D1

    P3_4 -->|充足→| P3_5
    P3_5 -->|PENDING→CANCELLED| D3_r
    P3_5 -->|キャンセル通知| D7
    P3_5 -.->|ありがとう通知| 助っ人
```

### 2.5 レベル2 DFD: P4 対戦交渉（詳細）

```mermaid
graph TB
    subgraph 外部
        代表["🧑 代表"]
        対戦相手["⚾ 対戦相手"]
        Claude["🤖 Claude Code"]
    end

    subgraph "P4: 対戦交渉"
        P4_1["P4.1: 打診文面生成"]
        P4_2["P4.2: 打診送信"]
        P4_3["P4.3: 返答記録"]
        P4_4["P4.4: 日程確定"]
        P4_5["P4.5: 他チーム自動キャンセル"]
    end

    subgraph データストア
        D1[("games")]
        D4_o[("opponent_teams")]
        D4_n[("negotiations")]
        D_ad[("available_dates")]
        D7[("notification_logs")]
    end

    代表 -->|対戦相手探して| Claude
    Claude -->|チームDB参照| D4_o
    Claude -->|空き日程参照| D_ad
    Claude -->|打診文面| P4_1
    P4_1 -->|文面提示| 代表

    代表 -->|送信OK| P4_2
    P4_2 -->|SENT作成| D4_n
    P4_2 -->|available_dates→PROPOSED| D_ad
    P4_2 -.->|メール/LINE| 対戦相手

    対戦相手 -->|返答| 代表
    代表 -->|返答入力| P4_3
    P4_3 -->|ステータス更新| D4_n

    P4_3 -->|ACCEPTED| P4_4
    P4_4 -->|日程確定| D1
    P4_4 -->|available_dates→BOOKED| D_ad

    P4_4 -->|他チーム| P4_5
    D4_n -->|同日程SENT| P4_5
    P4_5 -->|CANCELLED| D4_n
    P4_5 -->|キャンセル通知| D7
    P4_5 -.->|日程埋まり通知| 対戦相手
```

---

## 3. 試合ライフサイクル（状態遷移図）

```mermaid
stateDiagram-v2
    [*] --> DRAFT: 代表が作成

    DRAFT --> COLLECTING: 公開（出欠通知送信）
    DRAFT --> CONFIRMED: 練習の場合（簡略フロー）

    COLLECTING --> ASSESSING: 締切到来 or 代表が締切
    COLLECTING --> CANCELLED: 中止

    ASSESSING --> ARRANGING: 人数OK
    ASSESSING --> ARRANGING: 助っ人で充足
    ASSESSING --> CANCELLED: 人数不足で中止

    ARRANGING --> CONFIRMED: 相手・場所・審判確定
    ARRANGING --> CANCELLED: 手配失敗

    CONFIRMED --> COMPLETED: 試合実施・実績記録
    CONFIRMED --> CANCELLED: 雨天中止等

    COMPLETED --> SETTLED: 精算完了

    CANCELLED --> [*]
    SETTLED --> [*]
```

---

## 4. 助っ人打診フロー（シーケンス図）

```mermaid
sequenceDiagram
    actor 代表
    participant System as システム
    participant DB as Supabase
    participant A as 助っ人A
    participant B as 助っ人B
    participant C as 助っ人C

    代表->>System: 助っ人2人必要
    System->>DB: helpers候補取得
    DB-->>System: A, B, C（推薦順）
    System-->>代表: 候補リスト提示

    代表->>System: A, B, Cに打診
    System->>DB: helper_requests作成(PENDING×3)
    System->>A: 「4/12空いてますか？」
    System->>B: 「4/12空いてますか？」
    System->>C: 「4/12空いてますか？」

    B-->>System: OK
    System->>DB: B→ACCEPTED
    Note over System: 残り1人必要

    A-->>System: OK
    System->>DB: A→ACCEPTED
    Note over System: 充足！(2/2)

    System->>DB: C→CANCELLED(FULFILLED)
    System->>C: 「人数揃いました。ありがとう！」
    System-->>代表: 助っ人確定通知
```

---

## 5. 対戦相手日程調整フロー（シーケンス図）

```mermaid
sequenceDiagram
    actor 代表
    participant System as システム
    participant DB as Supabase
    participant X as Xチーム
    participant Y as Yチーム

    代表->>System: 空き日登録(4/5, 4/12, 4/19)
    System->>DB: available_dates(AVAILABLE×3)

    代表->>System: Xに4/5, 4/12を提案
    System->>DB: negotiation(SENT), dates→PROPOSED
    System->>X: 「4/5か4/12いかがですか？」

    代表->>System: Yに4/12, 4/19を提案
    System->>DB: negotiation(SENT), dates→PROPOSED
    System->>Y: 「4/12か4/19いかがですか？」

    Y-->>代表: 「4/12でOKです」
    代表->>System: Y返答入力(4/12 ACCEPTED)
    System->>DB: Y negotiation→ACCEPTED
    System->>DB: 4/12→BOOKED
    System->>DB: game.game_date=4/12, opponent=Y

    Note over System: 4/12が確定→Xの4/12提案をキャンセル
    System->>DB: X negotiation→更新
    System->>X: 「4/12は決まりました。4/5はまだ空いてます」
    System-->>代表: 対戦確定通知
```
