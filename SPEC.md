# mound 仕様書 v2.0

全員が野球に集中できる環境をつくる。

---

## ビジョン

### Phase 1: チーム運営の自動化（現在）
チーム代表の負担をゼロにする。出欠・精算・助っ人・グラウンド確保を自動化。

### Phase 2: チーム間接続
対戦マッチング・リーグ運営・助っ人ネットワークでチーム同士をつなぐ。

### Phase 3: 草野球ソーシャルプラットフォーム
使うだけでコミュニティが形成され、今まで出会えなかったチームと繋がれる。

---

## コンセプト

### 設計原則

**マニュアルレス。誰でも使える。魔法のような体験。**

1. **伝えるだけで動く** — 「4/11 練習試合 9時から」と言えば全部やる
2. **覚えることはない** — マニュアル不要。UIが文脈に合わせて変わる
3. **必要十分な情報だけ** — 今やるべきことだけが表示される。それ以外は隠れている
4. **人間もAIも同じ場にいる** — メンバー・助っ人・相手チーム・AIが一つのハブで繋がる
5. **入力は自然言語、閲覧は最適なUI** — チャットで指示、カレンダーで確認、リストで管理
6. **相手のITレベルに合わせる** — LINE only の人にはLINE、アプリ使う人にはリッチUI
7. **AI は提案する。人が最後に決める** — 自動化しても最終判断は人間

### ユーザー体験の理想形
1. タイムラインにレベル・日程・地域が合うチームの投稿が自然に出てくる
2. 「いいな」をタップ
3. AIエージェントが双方の空き日・グラウンド・レベルを照合し条件を自動交渉
4. 条件が合えば「○月○日、△△球場でどうですか？」と自動提案
5. 相手チームは承諾ボタンを押すだけ
6. 試合確定 → 出欠回収が自動スタート → 精算まで全自動

**人間がやるのは「いいな」と「承諾」だけ。間の交渉は全部AIエージェント。**

### チーム信頼度スコア
- 試合成立率・ドタキャン率・応答速度・マナー評価からスコアを算出
- 信頼度が高いチームほど良い対戦相手がレコメンドされる
- ドタキャンが多いチームはマッチング候補から外れる
- **真面目にやっているチームほど報われる仕組み**

### バイラル設計
プロダクトを使うだけで自然にコミュニティが広がる:
- 対戦を申し込む → 相手チームがmoundに登録
- 助っ人に声をかける → 助っ人が他チームにもmoundを広める
- リーグに参加 → リーグ全体がmoundで管理される
- メンバーが複数チーム掛け持ち → 他チームにも伝播

---

## 技術スタック

| 役割 | 技術 |
|------|------|
| Frontend / API | Next.js 14 (App Router) |
| 言語 | TypeScript |
| DB | Supabase Postgres |
| ORM | Prisma |
| 認証 | Supabase Auth |
| UI | Tailwind CSS + shadcn/ui |
| バリデーション | Zod |
| デプロイ | Vercel + Supabase |

---

## Phase 1 スコープ

以下の1ループだけを完成させる。

```
試合希望登録 → 出欠確認 → 状態遷移管理 → 承認 → 確定
```

### Phase 1 でやること

- チーム・メンバー管理
- 試合希望登録 (MatchRequest)
- 出欠確認 (AvailabilityResponse)
- 状態遷移エンジン
- 監査ログ

### Phase 1 でやらないこと

- AI 機能
- グラウンド監視
- 相手チーム交渉
- 通知 (LINE/Slack/Email)
- 課金

---

## ドメインモデル

### Team

| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | String (cuid) | |
| name | String | チーム名 |
| description | String? | |
| ownerId | String | 作成者 |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### Member (TeamMember)

| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | String (cuid) | |
| teamId | String | 所属チーム |
| userId | String | Supabase Auth ユーザー |
| role | OWNER / MANAGER / MEMBER | |

### MatchRequest

| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | String (cuid) | |
| teamId | String | |
| title | String | 例: "4月第1週の練習試合" |
| status | MatchRequestStatus | |
| desiredDateFrom | DateTime | 希望日程 開始 |
| desiredDateTo | DateTime | 希望日程 終了 |
| venue | String? | 希望グラウンド名 |
| minPlayers | Int (default: 9) | 成立最低人数 |
| note | String? | |
| createdAt | DateTime | |
| updatedAt | DateTime | |

### AvailabilityResponse

| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | String (cuid) | |
| matchRequestId | String | |
| teamMemberId | String | |
| status | AVAILABLE / UNAVAILABLE / UNDECIDED | |
| note | String? | |
| respondedAt | DateTime | |

※ (matchRequestId, teamMemberId) はユニーク。POST は upsert。

### AuditLog

| フィールド | 型 | 説明 |
|-----------|-----|------|
| id | String (cuid) | |
| matchRequestId | String? | |
| userId | String | 操作者 |
| action | String | 例: "TRANSITION:DRAFT→OPEN" |
| payload | Json? | 変更前後のスナップショット |
| createdAt | DateTime | |

---

## 状態遷移

```
DRAFT
  ↓ (管理者が公開)
OPEN
  ↓ (参加可 >= minPlayers)
NEGOTIATING
  ↓ (相手・日程・会場が揃った)
READY_TO_CONFIRM
  ↓ (管理者が最終承認)
CONFIRMED

分岐:
  OPEN         → CANCELLED  (管理者がキャンセル)
  NEGOTIATING  → FAILED     (管理者が断念)
  READY_TO_CONFIRM → FAILED (管理者が却下)
```

### 遷移ルール

| from | to | 必要ロール | ガード条件 |
|------|-----|-----------|-----------|
| DRAFT | OPEN | OWNER / MANAGER | なし |
| OPEN | NEGOTIATING | OWNER / MANAGER | AVAILABLE 人数 >= minPlayers |
| OPEN | CANCELLED | OWNER / MANAGER | なし |
| NEGOTIATING | READY_TO_CONFIRM | OWNER / MANAGER | なし |
| NEGOTIATING | FAILED | OWNER / MANAGER | なし |
| READY_TO_CONFIRM | CONFIRMED | OWNER / MANAGER | なし |
| READY_TO_CONFIRM | FAILED | OWNER / MANAGER | なし |

DRAFTへの巻き戻しは行わない。DRAFT 中の編集は PATCH で行う。

---

## API 一覧

### 認証

| Method | Path | 処理 |
|--------|------|------|
| POST | `/api/auth/callback` | Supabase Auth コールバック |

### チーム

| Method | Path | 処理 | 権限 |
|--------|------|------|------|
| POST | `/api/teams` | チーム作成 | ログイン済み |
| GET | `/api/teams` | 自分の所属チーム一覧 | ログイン済み |
| GET | `/api/teams/[id]` | チーム詳細 + メンバー | メンバー |
| PATCH | `/api/teams/[id]` | チーム情報更新 | OWNER / MANAGER |
| DELETE | `/api/teams/[id]` | チーム削除 | OWNER |
| POST | `/api/teams/[id]/members` | メンバー追加 | OWNER / MANAGER |
| DELETE | `/api/teams/[id]/members/[memberId]` | メンバー削除 | OWNER / MANAGER |

### 試合リクエスト

| Method | Path | 処理 | 権限 |
|--------|------|------|------|
| POST | `/api/match-requests` | リクエスト作成 (→DRAFT) | OWNER / MANAGER |
| GET | `/api/match-requests?teamId=[id]` | チームのリクエスト一覧 | メンバー |
| GET | `/api/match-requests/[id]` | リクエスト詳細 | メンバー |
| PATCH | `/api/match-requests/[id]` | リクエスト編集 (DRAFT のみ) | OWNER / MANAGER |
| POST | `/api/match-requests/[id]/transition` | 状態遷移 | OWNER / MANAGER |

### 出欠

| Method | Path | 処理 | 権限 |
|--------|------|------|------|
| GET | `/api/match-requests/[id]/availability` | 出欠一覧 | メンバー |
| POST | `/api/match-requests/[id]/availability` | 出欠回答 (upsert) | メンバー |

### 監査ログ

| Method | Path | 処理 | 権限 |
|--------|------|------|------|
| GET | `/api/audit-logs?matchRequestId=[id]` | ログ一覧 | OWNER / MANAGER |

---

## 画面一覧

| 画面 | パス | 説明 |
|------|------|------|
| ログイン | `/login` | メール+パスワード |
| サインアップ | `/signup` | |
| ダッシュボード | `/` | 直近リクエスト一覧 |
| チーム一覧 | `/teams` | 所属チームカード |
| チーム作成 | `/teams/new` | |
| チーム詳細 | `/teams/[id]` | メンバー管理込み |
| リクエスト一覧 | `/match-requests` | ステータスフィルター付き |
| リクエスト作成 | `/match-requests/new` | |
| リクエスト詳細 | `/match-requests/[id]` | 状態遷移ボタン + 出欠サマリー + 監査ログ |
| 出欠回答 | `/match-requests/[id]/availability` | メンバーが回答する画面 |

---

## ディレクトリ構成

```
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   └── signup/page.tsx
│   │   ├── (dashboard)/
│   │   │   ├── layout.tsx
│   │   │   ├── page.tsx
│   │   │   ├── teams/
│   │   │   │   ├── page.tsx
│   │   │   │   ├── new/page.tsx
│   │   │   │   └── [id]/page.tsx
│   │   │   └── match-requests/
│   │   │       ├── page.tsx
│   │   │       ├── new/page.tsx
│   │   │       └── [id]/
│   │   │           ├── page.tsx
│   │   │           └── availability/page.tsx
│   │   └── api/
│   │       ├── teams/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       ├── route.ts
│   │       │       └── members/
│   │       │           ├── route.ts
│   │       │           └── [memberId]/route.ts
│   │       ├── match-requests/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       ├── route.ts
│   │       │       ├── transition/route.ts
│   │       │       └── availability/route.ts
│   │       └── audit-logs/route.ts
│   ├── components/
│   │   ├── ui/               # shadcn/ui
│   │   ├── match-request/
│   │   │   ├── StatusBadge.tsx
│   │   │   └── TransitionButton.tsx
│   │   └── team/
│   │       └── TeamCard.tsx
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── supabase/
│   │   │   ├── client.ts
│   │   │   └── server.ts
│   │   ├── engine/
│   │   │   ├── transitions.ts  # 遷移テーブル定義
│   │   │   └── engine.ts       # transition() 関数
│   │   └── validators/
│   │       ├── team.ts
│   │       └── match-request.ts
│   └── types/index.ts
├── prisma/schema.prisma
├── .env.local
├── .env.example
├── next.config.ts
├── tailwind.config.ts
└── package.json
```

---

## 実装順序

1. プロジェクト初期化 (Next.js + Prisma + Supabase + shadcn/ui)
2. 認証 (Supabase Auth + middleware)
3. Prisma スキーマ + マイグレーション
4. 状態遷移エンジン (`lib/engine/`)
5. チーム管理 API + 画面
6. 試合リクエスト API + 画面
7. 出欠確認 API + 画面
8. 監査ログ API + 表示
9. Vercel デプロイ

---

## 将来フェーズ (Phase 1 では実装しない)

- **Phase 2**: グラウンド監視 + 相手チーム交渉管理 + 通知
- **Phase 3**: AI 文面生成 + 候補提案 + 成立可能性スコア
- **Phase 4**: 半自動交渉 + 課金
- **Phase 5**: エージェント同士の自動交渉
