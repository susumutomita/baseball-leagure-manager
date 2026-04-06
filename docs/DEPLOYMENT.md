# デプロイガイド

mound を本番環境にデプロイする手順。

## 前提条件

- [Supabase](https://supabase.com) アカウント
- [Vercel](https://vercel.com) アカウント
- [LINE Developers](https://developers.line.biz/) アカウント
- Node.js 20+ / Bun 1.0+

## 1. Supabase プロジェクト作成

1. [Supabase Dashboard](https://supabase.com/dashboard) で新規プロジェクト作成
2. リージョン: `Northeast Asia (Tokyo)` 推奨
3. プロジェクト作成後、以下を控える:
   - **Project URL**: `https://xxx.supabase.co`
   - **anon key**: Settings → API → `anon` `public` key
   - **Project Ref**: Settings → General → Reference ID

## 2. データベースマイグレーション

```bash
# Supabase CLI インストール
bun add -g supabase

# ログイン
supabase login

# プロジェクトにリンク
supabase link --project-ref YOUR_PROJECT_REF

# マイグレーション適用
supabase db push
```

マイグレーションファイル:
- `00001_initial_schema.sql` — 基本テーブル
- `00002_v2_schema.sql` — v2 スキーマ
- `00003_liff_index.sql` — LIFF インデックス
- `00004_simplify_game_statuses.sql` — ステータス簡素化
- `00005_add_member_role.sql` — メンバーロール
- `00006_rls_policies.sql` — Row Level Security
- `00007_leagues.sql` — リーグ機能
- `00008_viral_features.sql` — バイラル機能

## 3. LINE Developers 設定

### LINE Login チャネル作成
1. [LINE Developers](https://developers.line.biz/) → プロバイダー作成
2. LINE Login チャネル作成
3. 「コールバック URL」に以下を設定:
   ```
   https://your-app.vercel.app/api/auth/line/callback
   ```
4. 以下の値を控える:
   - **Channel ID**
   - **Channel Secret**

### Messaging API チャネル作成
1. Messaging API チャネル作成
2. **Channel Access Token** を発行

### LIFF アプリ作成
1. LINE Login チャネル内で LIFF アプリ追加
2. エンドポイント URL: `https://your-app.vercel.app/liff`
3. サイズ: `Full`
4. **LIFF ID** を控える

## 4. Vercel デプロイ

```bash
# Vercel CLI インストール
bun add -g vercel

# プロジェクトルートで
vercel

# 環境変数設定
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY
vercel env add NEXT_PUBLIC_LIFF_ID
vercel env add NEXT_PUBLIC_SITE_URL
vercel env add LINE_CHANNEL_ID
vercel env add LINE_CHANNEL_ACCESS_TOKEN
vercel env add LINE_CHANNEL_SECRET
vercel env add SESSION_SECRET
vercel env add RSVP_TOKEN_SECRET
vercel env add INVITATION_SECRET
vercel env add CRON_SECRET

# 本番デプロイ
vercel --prod
```

### シークレット値の生成

```bash
# SESSION_SECRET, RSVP_TOKEN_SECRET, INVITATION_SECRET, CRON_SECRET
openssl rand -base64 32
```

## 5. Cron ジョブ設定

`vercel.json` に以下を追加（または Vercel Dashboard から設定）:

```json
{
  "crons": [
    { "path": "/api/cron/orchestrate", "schedule": "*/30 * * * *" },
    { "path": "/api/cron/reminders", "schedule": "0 9,18 * * *" },
    { "path": "/api/cron/deadlines", "schedule": "0 * * * *" },
    { "path": "/api/cron/grounds", "schedule": "0 6 * * *" }
  ]
}
```

## 6. 動作確認

1. `https://your-app.vercel.app` にアクセス
2. 「LINE で始める」→ LINE ログイン
3. チーム作成 → メンバー追加 → 試合作成 → 出欠リンク生成
4. Web RSVP リンクから出欠回答

## トラブルシューティング

| 症状 | 原因 | 対処 |
|------|------|------|
| ログイン後に白画面 | Supabase 未接続 | `NEXT_PUBLIC_SUPABASE_URL` を確認 |
| LINE ログインエラー | コールバック URL 未設定 | LINE Developers でURL登録 |
| 500 エラー | 環境変数不足 | Vercel の Environment Variables を確認 |
| RSVP リンクが無効 | `RSVP_TOKEN_SECRET` 未設定 | 環境変数を追加 |
