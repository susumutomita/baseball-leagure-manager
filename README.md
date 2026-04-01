# mound

草野球チーム向け試合成立エンジン SaaS。
試合の日程調整・出欠確認・グラウンド確保を状態管理付きで自動化する。

> AI は提案する。システムは状態を持つ。人が最後に決める。

## クイックスタート

```bash
cp .env.example .env   # NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY を設定
make start
```

## 主要コマンド

| コマンド | 用途 |
| --- | --- |
| `make check` | lint + typecheck + test (コミット前に必須) |
| `make test` | テスト実行 |
| `make lint-fix` | 自動修正 |
| `make help` | 全コマンド一覧 |

## 仕様・設計ドキュメント

- [SPEC.md](./SPEC.md) — 機能仕様・ドメインモデル
- [docs/architecture.md](./docs/architecture.md) — アーキテクチャ設計
- [docs/data-model.md](./docs/data-model.md) — データモデル・ER図
- [docs/agent-protocol.md](./docs/agent-protocol.md) — AI エージェントプロトコル

## 禁止事項

- 認証情報・秘密鍵のハードコード禁止 (`.env` を使用)
- `make check` が通らない状態でのコミット禁止
- TypeScript strict mode の無効化禁止
