# CLAUDE.md

## プロジェクト概要

草野球チーム向け試合成立エンジン SaaS。仕様は [SPEC.md](./SPEC.md) を参照。

## コマンド

```bash
make check          # lint + typecheck + test (変更後に必ず実行)
make lint-fix       # 自動修正
make test           # テスト実行
make start          # 開発サーバー起動
make help           # 全コマンド一覧
```

## 開発ルール

### 変更後は必ず `make before-commit` を通す

lint・型チェック・テストが全て通ることを確認してからコミットする。

### テスト — BDD スタイル

日本語の `describe` / `it` で振る舞いを記述する。テスト名は「〜のとき」「〜する」形式。

```ts
describe("canConfirm", () => {
  describe("すべての条件を満たしているとき", () => {
    it("確定を許可する", () => { ... });
  });
});
```

- Arrange-Act-Assert パターンを守る
- 1つの `it` で1つの振る舞いのみテストする
- ファクトリ関数 (`createMatchRequest()` など) でデフォルト値付きテストデータを用意し、差分だけ `overrides` で渡す
- テストファイルは `src/__tests__/*.test.ts` に配置する

### 禁止事項

- 認証情報・秘密鍵のハードコード禁止 → `.env` を使用
- TypeScript strict mode の無効化禁止
- ユーザー入力の無検証での使用禁止 (必ず Zod スキーマで検証)

### Git コミット

`feat:` / `fix:` / `refactor:` / `docs:` / `test:` / `chore:` のプレフィックスを使用する。

## ドキュメント

| ファイル | 内容 |
| --- | --- |
| [SPEC.md](./SPEC.md) | 機能仕様・ドメインモデル |
| [docs/architecture.md](./docs/architecture.md) | アーキテクチャ設計・通知戦略 |
| [docs/data-model.md](./docs/data-model.md) | データモデル・ER図・DFD |
| [docs/agent-protocol.md](./docs/agent-protocol.md) | AI エージェントプロトコル |
| [docs/diagrams.md](./docs/diagrams.md) | システム図 |
| [docs/migration-strategy.md](./docs/migration-strategy.md) | v1→v2 マイグレーション戦略 |
| [docs/operations-reality.md](./docs/operations-reality.md) | 運用上の現実・制約 |

## 設計思想

- AI は **提案** する (Planner) — AI が勝手に確定・実行しない
- システムは **状態を持つ** (State Machine) — 状態遷移は `packages/core/lib/state-machine.ts` が正本
- ルールエンジンが **暴走を防ぐ** (Governor) — `packages/core/lib/governor.ts` で成立条件を判定
- 人が **最後に承認する** — CONFIRMED 遷移は必ず人間のアクションを要求する

## 自律改善エージェント ガイドライン

スケジュール実行やIssueドリブンで自律的にプロダクトを改善するエージェント向けのルール。

### 実行フロー

```
1. GitHub Issues を確認 (open, ラベル: enhancement/bug/chore)
2. 優先度判定 (bug > enhancement > chore)
3. ブランチ作成 (claude/<issue-slug>-<number>)
4. 実装 + テスト追加
5. make check 通過を確認
6. コミット + プッシュ
7. PR 作成 (Closes #<number> をbodyに含める)
```

### 制約

- **破壊的変更禁止**: 既存のAPIシグネチャ・型定義を壊さない
- **テスト必須**: 新機能には必ずテストを追加する。既存テストを壊さない
- **1 Issue = 1 PR**: Issue ごとにブランチを分ける
- **スコープ厳守**: Issue に書かれた範囲のみ実装する。関連する改善を見つけても別 Issue にする
- **ドキュメント不要**: README/CLAUDE.md の更新はユーザーが明示的に依頼した場合のみ
- **依存追加は慎重に**: 新しい npm パッケージの追加は最小限に

### コード品質チェックリスト

- [ ] `make check` (lint + typecheck + test) が通る
- [ ] 新しいエクスポートは `packages/core/src/index.ts` に追加済み
- [ ] Zod バリデーションを使っている (ユーザー入力)
- [ ] `Result<T, E>` パターンでエラーハンドリングしている
- [ ] BDD スタイルのテストを書いている (日本語 describe/it)
- [ ] ファクトリ関数でテストデータを用意している

### パッケージ構造の理解

```
packages/core/   → ビジネスロジック (純粋関数・型定義・バリデーション)
packages/web/    → Next.js フロントエンド + API Routes
packages/mcp/    → Claude MCP サーバー (エージェント向けツール)
supabase/        → DB マイグレーション・シードデータ
scripts/         → ユーティリティスクリプト
```

core パッケージのモジュールを変更した場合、web/mcp で利用する場合は `index.ts` からエクスポートすること。
