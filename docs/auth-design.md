# 認証・認可設計

## 原則

- **認証は自前で作らない** — Supabase Auth を使用し、LINE を OAuth プロバイダーとして統合する
- **認可はアプリ層で制御** — `members.role` カラムによる role ベースアクセス制御 (RBAC)
- **LINE 認証で統一** — LIFF（LINE内）も Web ブラウザも、全て LINE Login で認証する

## 認証フロー

### Supabase Auth + LINE OAuth

Supabase Auth は LINE Login を外部 OAuth プロバイダーとしてサポートしている。

```
ユーザー → LINE Login → Supabase Auth → JWT セッション → アプリ
```

1. ユーザーが LINE Login ボタンをクリック
2. LINE の OAuth 認可画面にリダイレクト
3. 認可後、Supabase Auth のコールバック URL にリダイレクト
4. Supabase が JWT を発行し、セッションを管理
5. アプリは Supabase クライアントから `supabase.auth.getUser()` でユーザー情報取得

### LIFF 内アクセス

LINE アプリ内で LIFF として開いた場合:
- `liff.init()` → `liff.getAccessToken()` でアクセストークン取得
- サーバー側で LINE API でトークン検証
- Supabase Auth とは別経路だが、LINE ユーザー ID で `members` テーブルと紐付け

### Web ブラウザアクセス

LINE アプリ外（PC ブラウザ等）からのアクセス:
- Supabase Auth の `signInWithOAuth({ provider: 'line' })` を使用
- LINE Login の OAuth 2.0 フローでログイン
- Supabase がセッション管理

## 認可 (RBAC)

### Role 定義

| Role | 説明 | 制約 |
|---|---|---|
| `SUPER_ADMIN` | チーム設定、メンバー管理、全操作 | **チームに必ず1人**（削除不可） |
| `ADMIN` | 試合作成、遷移操作、出欠詳細閲覧 | 複数可 |
| `MEMBER` | 自分の出欠回答、チーム試合閲覧 | 複数可 |

### DB 変更

```sql
-- members テーブルに role カラム追加
ALTER TABLE members
  ADD COLUMN role TEXT NOT NULL DEFAULT 'MEMBER'
  CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'MEMBER'));
```

### アクセス制御マトリクス

| 画面/操作 | 未ログイン | MEMBER | ADMIN | SUPER_ADMIN |
|---|---|---|---|---|
| 試合予定概要（日程・場所） | ○ | ○ | ○ | ○ |
| 助っ人募集中表示 | ○ | ○ | ○ | ○ |
| 出欠詳細（誰が参加/不参加） | × | ○ | ○ | ○ |
| 自分の出欠回答 | × | ○ | ○ | ○ |
| 試合作成 | × | × | ○ | ○ |
| 試合確定/中止 | × | × | ○ | ○ |
| メンバー招待/削除 | × | × | × | ○ |
| チーム設定変更 | × | × | × | ○ |
| Role 変更 | × | × | × | ○ |

### SUPER_ADMIN 制約

- チーム作成者が自動的に SUPER_ADMIN になる
- SUPER_ADMIN は最低1人必要（最後の1人は降格/削除不可）
- SUPER_ADMIN は他のメンバーを ADMIN に昇格/降格できる
- アプリ層で制約を保証する（DELETE/UPDATE 前にチェック）

## 実装方針

### Supabase Auth 設定

1. LINE Login チャネルで Web ログイン用のコールバック URL を追加
2. Supabase ダッシュボードで LINE を外部プロバイダーとして設定
3. `supabase/config.toml` に LINE プロバイダー設定を追加

### Next.js ミドルウェア

```
middleware.ts
├── 認証チェック: Supabase Auth セッション確認
├── 未認証 → 公開ページのみ許可、それ以外は LINE Login へリダイレクト
└── 認証済み → members テーブルから role を取得、リクエストに付与
```

### API 認可ヘルパー

```typescript
// 各 API ルートで使用
const member = await requireAuth(request); // 未認証なら 401
requireRole(member, 'ADMIN');              // 権限不足なら 403
```

### Supabase RLS (Row Level Security)

将来的には Supabase の RLS ポリシーで DB レベルのアクセス制御も検討。
ただし初期実装ではアプリ層の認可チェックで十分。

## LINE Login 設定手順

1. LINE Developers Console → 既存チャネル → LINE Login 設定
2. コールバック URL に `https://[supabase-project].supabase.co/auth/v1/callback` を追加
3. Supabase ダッシュボード → Authentication → Providers → LINE を有効化
4. Channel ID と Channel Secret を設定
5. `supabase/config.toml` の `[auth.external]` に LINE プロバイダーを追加

## メンバー紐付けフロー

### 初回（チーム作成時）
1. LINE Login でログイン → Supabase Auth ユーザー作成
2. チーム作成 → `members` レコード作成（role: SUPER_ADMIN）
3. `line_user_id` を `members` に保存

### メンバー招待
1. SUPER_ADMIN/ADMIN が招待リンクを生成
2. メンバーがリンクを開く → LINE Login → Supabase Auth ユーザー作成
3. `members` レコード作成（role: MEMBER）
4. `line_user_id` を `members` に保存
