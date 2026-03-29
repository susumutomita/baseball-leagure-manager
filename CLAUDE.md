# CLAUDE.md

## プロジェクト概要

草野球チーム向け **試合成立エンジン SaaS**。
試合の日程調整・対戦相手交渉・グラウンド確保・出欠管理を状態管理付きで自動化する。

仕様書は [SPEC.md](./SPEC.md) を参照。

## 技術スタック

| レイヤー | 技術 |
|----------|------|
| ランタイム | [Bun](https://bun.sh/) |
| パッケージ管理 | Bun workspaces (モノレポ) |
| フロントエンド | Next.js (App Router) + React + Tailwind CSS |
| バックエンド | Next.js API Routes |
| DB | Supabase (Postgres) |
| Auth | Supabase Auth |
| リンター/フォーマッター | [Biome](https://biomejs.dev/) |
| テスト | Bun test (BDD スタイル) |
| 言語 | TypeScript (strict mode) |

## モノレポ構成

```
packages/
  core/   — ドメイン型・ステートマシン・ルールエンジン・監査ログ
  web/    — Next.js アプリ (UI + API Routes)
supabase/
  migrations/ — DBスキーマ (SQL)
```

## コマンド (Makefile)

```bash
make start          # ローカル開発サーバー起動 (install + dev)
make lint           # Biome lint チェック
make lint-fix       # Biome lint 自動修正
make format         # Biome フォーマット
make typecheck      # TypeScript 型チェック
make test           # テスト実行
make test-coverage  # テスト + カバレッジ表示
make check          # lint + typecheck + test 一括実行
make build          # プロダクションビルド
make clean          # ビルド成果物削除
make help           # 全コマンド一覧
```

## 開発ルール

### コード品質

- **変更後は必ず `bun run check` を実行**して lint・型チェック・テストが全て通ることを確認する
- Biome による自動フォーマット・import整理を利用する (`bun run lint:fix`)
- TypeScript strict mode を維持する

### テストの書き方 — BDD / t-wada スタイル

テストは **日本語の `describe` / `it` で振る舞いを記述する** BDD スタイルで書く。
[t-wada (和田卓人)](https://twitter.com/t_wada) 氏の提唱するスタイルに従い、以下を守る。

1. **テスト名は「〜のとき」「〜する」の形で書く**
   ```ts
   describe("canConfirm", () => {
     describe("すべての条件を満たしているとき", () => {
       it("確定を許可する", () => { ... });
     });
   });
   ```

2. **Arrange-Act-Assert パターン**を守る
   - テストデータの準備 → 実行 → 検証 の順に書く

3. **テストヘルパーでファクトリ関数を用意する**
   - `createMatchRequest()`, `createNegotiation()` のようにデフォルト値付きのヘルパーを作り、
     テストごとに必要な差分だけ `overrides` で渡す

4. **1つの `it` で1つの振る舞いだけテストする**

5. **テストファイルの配置**: `src/__tests__/` ディレクトリに `*.test.ts` で配置する

### セキュリティ

- 認証情報・秘密鍵をハードコードしない。環境変数 (`.env`) を使用する
- ユーザー入力は必ず検証する
- 最小権限の原則に従う

### Git コミット

- コミットメッセージは変更の意図が明確に伝わるように書く
- `feat:` / `fix:` / `refactor:` / `docs:` / `test:` / `chore:` のプレフィックスを使用する

### CI/CD

- **CI** (GitHub Actions): PR・pushごとに lint → typecheck → test → build を実行
  - 全ジョブが通らないとマージ不可
- **CD** (Vercel): main へのプッシュで自動デプロイ
  - デプロイ前にも lint + typecheck + test を実行
- **必要な Secrets** (GitHub リポジトリ設定):
  - `VERCEL_TOKEN` — Vercel API トークン
  - `NEXT_PUBLIC_SUPABASE_URL` — Supabase プロジェクト URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase Anon Key

### 設計思想

- AI は **提案** する (Planner)
- システムは **状態を持つ** (State Machine)
- ルールエンジンが **暴走を防ぐ** (Governor)
- 人が **最後に承認する**
- ログを残して **改善する** (Audit Log)
