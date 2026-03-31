# アーキテクチャ設計書

草野球チーム運営支援システムのアーキテクチャを、アウトサイドインで設計する。

---

## 0. プロダクトビジョン

### 何を売るのか

ツールではない。**草野球チーム運営のテンプレート**をシステムに焼き込んだもの。

既存ツール（調整さん、伝助、Play等）は「箱」を提供するだけで、使い方は代表が自分で考える。
このプロダクトは**運営フロー自体が組み込まれている**。代表は初期設定をするだけで、あとはシステムが回る。

```mermaid
graph LR
    subgraph "初期設定（1回だけ）"
        A1[メンバー登録]
        A2[助っ人候補登録]
        A3[グラウンド対象設定]
        A4[精算ルール設定]
    end

    subgraph "毎週（代表がやること）"
        B1["「試合を作成」ボタン"]
    end

    subgraph "自動で回るもの"
        C1[出欠通知] --> C2[段階的リマインド]
        C2 --> C3[締切処理]
        C3 --> C4[人数判定]
        C4 --> C5[助っ人打診]
        C5 --> C6[精算計算]
        C6 --> C7[精算通知]
    end

    subgraph "代表が判断するとき"
        D1["Claude Codeに聞く<br>(予測・推薦・文面生成)"]
    end

    B1 --> C1
```

### なぜ価値があるか

草野球チーム運営の悩みは驚くほど共通している。出欠が返ってこない、人数足りない、
グラウンド確保が大変、精算がめんどくさい、代表が孤軍奮闘。全チーム共通の課題。

このプロダクトは、実際のチーム運営（Xeros: 2003年設立、年間50試合以上）で蓄積された
運営ノウハウをテンプレートとしてシステムに焼き込んでいる。新しいチームの代表が
使い始めた瞬間に、ベストプラクティスが自動的に適用される。

### 通知チャネル戦略

LINE Messaging APIの無料枠は月200通。メンバー15人×月4試合のリマインドでギリギリ。
費用をかけずにスケールするため、メール（Gmail）を併用する。

| 通知種別 | チャネル | 理由 |
|---------|---------|------|
| 初回出欠依頼 | LINE Push | 気づきやすい。月4回×15人=60通 |
| リマインド | メール + Webリンク | LINE通数を消費しない |
| 精算通知 | メール + Webリンク | 金額詳細はメールの方が見やすい |
| 緊急連絡(雨天中止等) | LINE Push | 即時性が必要 |

メールからの回答はWebページ上の1タップで完結する（チャット風UI不要、ボタン1つ）。

### スマホアプリ戦略

LINE通数制限の根本的解決として、メンバー向けスマホアプリを提供する。
プッシュ通知が無料・無制限で使えるため、通知チャネルの制約がなくなる。

```mermaid
graph LR
    subgraph "代表"
        W[Web Dashboard<br>Next.js]
        CC[Claude Code]
    end

    subgraph "メンバー"
        APP[スマホアプリ<br>Expo]
    end

    W --> DB[(Supabase)]
    CC --> DB
    APP --> DB
    APP -.->|プッシュ通知<br>無料・無制限| APP
```

**カレンダー連携:**
- Googleカレンダー: 試合確定時に自動追加（場所・時間・持ち物）
- TimeTree: 共有カレンダーに反映（家族に予定が見える）
- カレンダー側のリマインドも活用できる（アプリ通知と二重で気づく）

**インストール障壁の対策:**
- メンバーに「新しいツールを覚えさせない」原則との矛盾があるが、
  アプリは1回インストールすれば通知タップ→出欠回答の2アクションで完結。
  調整さん等のWebツールより体験は良い。
- LINE公式アカウントのリッチメニューからアプリへの導線を用意することで、
  LINEの延長として使わせる。

---

## 1. アウトサイドイン: ユーザーストーリーから始める

### 1.1 アクターの定義

```mermaid
graph TB
    代表["🧑 代表<br>ITリテラシー高い<br>全業務を一人で回す"]
    メンバーPro["👤 メンバー(プロ)<br>毎週参加<br>ITリテラシーはバラバラ"]
    メンバーLite["👤 メンバー(ライト)<br>参加頻度低い"]
    助っ人["🤝 助っ人<br>チーム非所属の外部個人"]
    対戦相手["⚾ 対戦相手チーム<br>同じ課題を抱えている"]
    審判["🎌 審判<br>S級 / 湘南審判協会"]
    自治体["🏛️ 自治体予約システム<br>6箇所"]

    代表 -->|Web + Claude Code| システム["⚙️ 草野球運営支援システム"]
    メンバーPro -->|アプリのみ| システム
    メンバーLite -->|アプリのみ| システム
    助っ人 -->|LINE（代表経由）| システム
    対戦相手 -->|メール / LINE| 代表
    審判 -->|LINE / 電話| 代表
    自治体 -->|Webスクレイピング| システム
```

### 1.2 コアユーザーストーリー（代表の1週間）

Phase 1で解決すべきストーリーを時系列で並べる。

```mermaid
graph TB
    subgraph "月曜日（4週間前）"
        A1["代表: 試合作成"] --> A2["システム: 出欠通知送信"]
        A2 --> A3["メンバー: アプリで回答"]
    end

    subgraph "火〜木（自動）"
        B1["24h: 未回答者にリマインド"]
        B2["48h: 個別メンション付きリマインド"]
        B3["72h: 未回答→不参加扱い"]
        B1 --> B2 --> B3
    end

    subgraph "金曜日（3.5週間前）"
        C1["代表→Claude Code: 今の状況は？"]
        C2["Claude: 7人確定+予測2人=9人見込み"]
        C3["足りなければ助っ人打診"]
        C1 --> C2 --> C3
    end

    subgraph "同時期"
        D1["代表→Claude Code: 対戦相手探して"]
        D2["Claude: 候補提示+打診文面生成"]
        D1 --> D2
    end

    subgraph "1週間前"
        E1["審判手配"]
        E2["グラウンド確保状況確認"]
    end

    subgraph "前日"
        F1["精算予定通知<br>グラウンド代¥5,760+審判代¥5,000<br>→一人あたり¥600"]
    end

    subgraph "当日"
        G1["参加実績記録<br>（誰が来た/ドタキャン）"]
    end

    subgraph "翌日"
        H1["PayPayで精算実行"]
    end

    A3 --> B1
    B3 --> C1
    C3 --> E1
    E2 --> F1
    F1 --> G1
    G1 --> H1
```

### 1.3 メンバー側のユーザーストーリー（最小限）

メンバーがやることは**アプリで2タップ以内**で完結する。

```mermaid
graph LR
    A["📱 プッシュ通知が届く<br>「○月○日の試合、出欠を教えてください」"]
    B["👆 タップして開く"]
    C["✅ 「参加」「不参加」「未定」をタップ"]
    D["✨ 完了"]

    A --> B --> C --> D
```

メンバーはアカウント登録不要（Google/LINEログインで完結）。

---

## 2. システムコンテキスト図

### 2.1 コンテキスト境界

```mermaid
graph TB
    代表["🧑 代表"]
    CC["🤖 Claude Code"]
    メンバー["👥 メンバー"]

    subgraph "草野球運営支援システム"
        WD["Web Dashboard"]
        AI["AI判断エンジン"]
        Worker["自動化Worker"]
        LINE_I["LINE連携"]
        APP["スマホアプリ"]
    end

    代表 --> WD
    CC --> AI
    メンバー -->|アプリ| APP
    メンバー -->|LINE| LINE_I

    subgraph "外部サービス"
        LINE_API["LINE Messaging API"]
        PayPay["PayPay"]
        三番地["草野球三番地"]
        GCal["Google Calendar"]
        TT["TimeTree"]
    end

    subgraph "自治体予約システム"
        横浜["横浜市"]
        藤沢["藤沢市"]
        平塚["平塚市"]
        鎌倉["鎌倉市"]
        神奈川["神奈川県"]
        綾瀬["綾瀬市"]
    end

    LINE_I --> LINE_API
    Worker --> 横浜 & 藤沢 & 平塚 & 鎌倉 & 神奈川 & 綾瀬
    APP --> GCal & TT
```

### 2.2 システム外のもの（境界の外）

| 対象 | なぜ外か | 連携方法 |
|------|---------|---------|
| 草野球三番地 | プラットフォーム。置き換えない | 手動（募集URLをコピペ） |
| PayPay | 決済API非公開（個人利用） | 精算額を計算してアプリ通知。実際の送金は手動 |
| 対戦相手チーム | 相手はシステムを使わない | メール/LINE文面を生成して代表が送信 |
| 審判 | 少人数の個人 | LINE/電話で代表が手配 |
| スポーツ保険 | 年1回の手続き | スコープ外 |

### 2.3 システム内のもの（境界の内）

| 機能 | トリガー | AI要否 |
|------|---------|--------|
| 試合(Game)作成 | 代表がWeb or Claude Codeで作成 | 不要 |
| 出欠通知送信 | Game作成時に自動 | 不要 |
| 出欠回答受付 | メンバーがアプリでタップ | 不要 |
| 段階的リマインド | Cron（24h/48h/72h） | 不要 |
| 締切自動進行 | Cron（締切到来時） | 不要 |
| 出席予測・人数判定 | 代表がClaude Codeで問い合わせ | **必要** |
| 助っ人候補推薦 | 代表がClaude Codeで問い合わせ | **必要** |
| 助っ人打診 | 代表がClaude Codeから指示 | 一部必要（文面生成） |
| 対戦相手打診文面生成 | 代表がClaude Codeから指示 | **必要** |
| 参加実績記録 | 代表がアプリ or Claude Codeで入力 | 不要 |
| 精算計算 | 参加実績確定後に自動 | 不要 |
| 精算通知 | 代表が確認後に送信指示 | 不要 |
| グラウンド空き監視 | Cron（定期スクレイピング） | 不要 |
| グラウンド空き通知 | 空き検出時に自動 | 不要 |
| 個人成績集計 | 試合結果入力後に自動 | 不要 |
| 区分変更提案 | 代表がClaude Codeで問い合わせ | **必要** |
| 週次レポート | 代表がClaude Codeで生成 | **必要** |

---

## 3. ロジカルアーキテクチャ

### 3.1 レイヤー構成

```mermaid
graph TB
    subgraph "プレゼンテーション層"
        WD["Web Dashboard<br>(代表専用)"]
        APP["スマホアプリ<br>(メンバー用)"]
        LINE_BOT["LINE Bot<br>(フォールバック)"]
        CC["Claude Code<br>(代表専用)"]
    end

    subgraph "アプリケーション層"
        subgraph "ユースケース群"
            UC1["試合ライフサイクル管理<br>作成→出欠収集→人数判定→確定→精算"]
            UC2["出欠管理<br>通知→回答受付→リマインド→締切処理"]
            UC3["助っ人管理<br>候補DB→打診→回答→充足→自動キャンセル"]
            UC4["対戦相手管理<br>チームDB→打診→交渉→確定→他チームキャンセル"]
            UC5["精算管理<br>費用入力→一人あたり算出→PayPayディープリンク"]
            UC6["グラウンド監視<br>対象登録→定期チェック→空き通知"]
            UC7["個人成績<br>打席結果入力→自動集計→スタッツ表示"]
        end

        subgraph "AI判断サービス"
            AI1["出席予測（過去実績ベース）"]
            AI2["助っ人推薦（候補リスト+過去参加実績）"]
            AI3["文面生成（対戦打診、リマインド等）"]
            AI4["メンバー区分変更提案"]
        end
    end

    subgraph "ドメイン層"
        DM1["Team / Member / Helper"]
        DM2["Game / RSVP / Attendance"]
        DM3["Opponent / Negotiation"]
        DM4["Ground / GroundSlot"]
        DM5["Expense / Settlement"]
        DM6["GameResult / AtBat / PitchingStat"]
        DM7["NotificationLog / AuditLog"]
    end

    subgraph "インフラストラクチャ層"
        DB["Supabase PostgreSQL"]
        LINE_API["LINE Messaging API"]
        SCRAPER["自治体予約サイト<br>スクレイパー"]
        PUSH["Expo Notifications"]
        CAL["Google Calendar / TimeTree API"]
    end

    WD & APP & LINE_BOT & CC --> UC1 & UC2 & UC3 & UC4 & UC5 & UC6 & UC7
    CC --> AI1 & AI2 & AI3 & AI4
    UC1 & UC2 & UC3 & UC4 & UC5 & UC6 & UC7 --> DM1 & DM2 & DM3 & DM4 & DM5 & DM6 & DM7
    DM1 & DM2 & DM3 & DM4 & DM5 & DM6 & DM7 --> DB & LINE_API & SCRAPER & PUSH & CAL
```

### 3.2 ドメイン境界（Bounded Context）

```mermaid
graph TB
    subgraph "チーム管理"
        T[Team]
        M["Member<br>(tier: PRO/LITE)"]
        H["Helper<br>(外部個人)"]
    end

    subgraph "試合管理"
        G["Game<br>(type: practice/friendly/<br>league/tournament)"]
        R["RSVP<br>(事前出欠回答)"]
        A["Attendance<br>(当日実績)"]
    end

    subgraph "個人成績"
        GR["GameResult"]
        AB["AtBat<br>(打席結果)"]
        PS["PitchingStat<br>(投手成績)"]
        FE["FieldingEntry<br>(守備出場)"]
    end

    subgraph "対戦管理"
        OT[OpponentTeam]
        N[Negotiation]
        AD["AvailableDate<br>(空き日程)"]
    end

    subgraph "グラウンド管理"
        GD["Ground<br>(監視対象)"]
        GS["GroundSlot<br>(空き情報)"]
    end

    subgraph "精算管理"
        S["Settlement<br>(試合単位)"]
        E["Expense<br>(費目別)"]
    end

    subgraph "通知管理（横断的）"
        NL["NotificationLog"]
        AL["AuditLog"]
    end

    M --> R
    M --> A
    M --> AB & PS & FE
    H --> A
    G --> R & A & GR & AB & PS & FE
    G --> N
    G --> S & E
    OT --> N
    T --> M & H & G & OT & GD & AD
    GD --> GS
```

### 3.3 通知ドメイン（横断的関心事）

```mermaid
graph LR
    subgraph "通知管理"
        NT["NotificationTemplate<br>(テンプレート)"]
        NL["NotificationLog<br>(送信履歴)"]
        RR["ReminderRule<br>(24h/48h/72h)"]
    end

    subgraph "送信チャネル"
        PUSH["📱 Expo Push Notification<br>(アプリ)"]
        LINE["💬 LINE Push<br>(月200通制限)"]
        EMAIL["📧 メール<br>(フォールバック)"]
    end

    NT --> PUSH & LINE & EMAIL
    NL --- PUSH & LINE & EMAIL
    RR --> NT
```

### 3.4 試合ライフサイクル（状態遷移）

インタビュー結果に基づき、現行SPEC.mdの状態遷移を修正。

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

## 4. 物理アーキテクチャ

### 4.1 デプロイメント構成

```mermaid
graph TB
    subgraph "代表のマシン"
        CC["Claude Code Max<br>・Supabase読み取り<br>・AI判断（予測・推薦・文面）<br>・LINE API呼び出し"]
    end

    subgraph "exe.dev"
        NEXT["Expo Web / Next.js<br>Web Dashboard（代表用）<br>API Routes"]
        WEBHOOK["LINE Webhook<br>受信エンドポイント"]
        CRON["Cron Workers<br>・リマインド送信<br>・出欠締切処理<br>・グラウンド監視"]
    end

    subgraph "Supabase Cloud"
        PG["PostgreSQL<br>・teams, members, helpers<br>・games, rsvps, attendances<br>・at_bats, pitching_stats<br>・expenses, settlements<br>・opponent_teams, negotiations<br>・grounds, ground_slots<br>・notification_logs, audit_logs"]
        AUTH["Supabase Auth<br>Google / Apple / LINE"]
        RT["Supabase Realtime<br>(将来: リアルタイム更新)"]
        EDGE["Edge Functions<br>Webhook / Cron"]
    end

    subgraph "App Stores"
        IOS["📱 iOS App<br>(App Store)"]
        AND["📱 Android App<br>(Google Play)"]
    end

    subgraph "外部サービス"
        LINE_API["LINE Messaging API<br>・Webhook → exe.dev<br>・Push Message<br>・Flex Message"]
        MUNI["自治体予約システム（6箇所）<br>ground-reservation<br>スクレイパー"]
        GCAL["Google Calendar API"]
        TIMETREE["TimeTree API"]
        EXPO_PUSH["Expo Push Service"]
    end

    CC -->|HTTPS| PG
    CC -->|HTTPS| LINE_API

    NEXT -->|HTTPS| PG
    WEBHOOK -->|HTTPS| PG
    CRON -->|HTTPS| PG
    CRON --> MUNI

    IOS & AND -->|HTTPS| PG
    IOS & AND --> EXPO_PUSH
    IOS & AND --> GCAL & TIMETREE

    LINE_API -->|Webhook| WEBHOOK
    EXPO_PUSH -->|Push| IOS & AND
```

### 4.2 Vercel vs exe.dev の判断

| 項目 | Vercel | exe.dev |
|------|--------|---------|
| Next.js ホスティング | 得意 | 可能 |
| Cron Worker | 制限あり（Hobby: 1日1回） | 自由 |
| LINE Webhook 常時受信 | Serverless（コールドスタート） | 常時起動可 |
| 費用 | 無料枠あり | 契約済み |

**判断:** exe.devをメインのホスティングとし、Vercelは不要（exe.devでNext.jsもCronも動かせる）。
ただし、Vercelの方が便利であればVercel(フロント) + exe.dev(Worker)の分離も可。

### 4.3 AI実行の制約と設計

```mermaid
graph TB
    subgraph "絶対ルール"
        R1["❌ サードパーティからClaude自動呼び出し禁止<br>（TOS違反 → BAN対象）"]
        R2["❌ Open Claw等の非公式クライアント禁止"]
        R3["✅ 代表がClaude Codeを起動したときのみAI実行"]
    end

    subgraph "AI不要（exe.dev Cronで自動実行）"
        A1["出欠リマインド送信<br>ルール: 24h/48h/72h"]
        A2["出欠締切処理<br>ルール: 締切到来時に未回答→不参加"]
        A3["精算額計算<br>ルール: 費用÷メンバー数"]
        A4["グラウンド空き通知<br>ルール: 空き検出時"]
    end

    subgraph "AI必要（代表が手動でClaude Code実行）"
        B1["出席予測<br>過去データからの統計推論"]
        B2["助っ人推薦<br>候補のスコアリング+理由"]
        B3["打診文面生成<br>相手チームへの自然な文面"]
        B4["メンバー区分変更提案<br>参加率分析+変更理由"]
    end

    代表["🧑 代表"] -->|手動起動| CC["Claude Code Max"]
    CC --> B1 & B2 & B3 & B4
    CC -->|Supabase読み書き| DB[(Supabase)]
    A1 & A2 & A3 & A4 -->|自動| DB
```

### 4.4 セキュリティ・プライバシー設計

```mermaid
graph TB
    subgraph "最小限の個人情報"
        M["メンバー:<br>名前（ニックネーム可）<br>+ LINE User ID のみ"]
        H["助っ人:<br>名前 + LINE連絡先 のみ"]
        X["❌ 住所・電話番号・家族情報は保持しない<br>（過去に問題になった）"]
    end

    subgraph "認証"
        AUTH1["代表: Supabase Auth<br>(Google / Apple)"]
        AUTH2["メンバー: アプリログイン<br>(Google / LINE / Apple)"]
    end

    subgraph "データアクセス制御"
        RLS["Supabase RLS:<br>代表のチームのデータのみ"]
        SIG["LINE Webhook:<br>署名検証で不正排除"]
        LOCAL["Claude Code:<br>代表のマシンからのみ"]
    end

    AUTH1 --> RLS
    AUTH2 --> RLS
```

---

## 5. 技術スタック（確定）

| レイヤー | 技術 | 理由 |
|---------|------|------|
| フロントエンド | Expo (React Native) | iOS / Android / Web を1コードベースで |
| ルーティング | Expo Router | ファイルベース。Next.js App Routerと同じ感覚 |
| UI | NativeWind (Tailwind for RN) | Tailwind記法をReact Nativeで使える |
| 言語 | TypeScript (strict) | 既存実装を活かす |
| DB | Supabase PostgreSQL | SQLの強み（精算集計・統計）。無料枠十分 |
| 認証 | Supabase Auth | Google / Apple / LINE（カスタムOIDC） |
| クエリ | @supabase/supabase-js | Expoではssr不要。通常クライアント |
| プッシュ通知 | Expo Notifications | 無料・無制限。iOS/Android両対応 |
| サーバーサイドロジック | Supabase Edge Functions | Webhook受信、Cronジョブ（リマインド、締切処理等） |
| カレンダー連携 | Google Calendar API / TimeTree API | 試合確定時に自動追加 |
| ホスティング(Web) | exe.dev or Vercel | Expo for Webの配信 |
| グラウンド監視 | ground-reservation (Python) | 既存実装。exe.devに統合 |
| AI判断 | Claude Code Max | TOS準拠。代表が手動実行 |
| パッケージマネージャ | Bun | 既存実装 |
| Linter | Biome | 既存実装 |
| CI/CD | GitHub Actions + EAS Build | アプリビルドはExpo Application Services |
| テスト | Bun test (BDD) | 既存実装 |

### モノレポ構成（新）

```mermaid
graph TB
    subgraph "packages/"
        CORE["core/<br>ドメイン型定義<br>ステートマシン<br>ビジネスロジック<br>（既存、共有）"]
        APP["app/<br>Expo アプリ<br>iOS / Android / Web<br>（新規）"]
        WEB["web/<br>Next.js<br>代表用ダッシュボード<br>（既存→段階的にExpo Webに統合）"]
    end

    subgraph "supabase/"
        MIG["migrations/<br>DBスキーマ"]
        FN["functions/<br>Edge Functions<br>Webhook / Cron<br>（新規）"]
        SEED["seed.sql<br>テストデータ"]
    end

    CORE --> APP
    CORE --> WEB
    CORE --> FN
```

`packages/core` はフロントエンド（Expo）とサーバーサイド（Edge Functions）の両方から参照される。

---

## 6. 次のステップ

1. **データモデル設計** — ドメイン層のエンティティをSQLスキーマに落とす → ✅ `docs/data-model.md`
2. **LINE Bot設計** — Flex Message, Webhook, リッチメニューの設計
3. **Phase 1実装計画** — 出欠管理の最小ループを動かす
