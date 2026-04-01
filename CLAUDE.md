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
