.PHONY: start dev build lint lint-fix lint-check format typecheck test test-watch test-coverage check clean install install-ci

# ===================================================
# 試合成立エンジン — Makefile
# ===================================================

## 起動
start: install dev ## ローカル開発サーバーを起動

dev: ## Next.js 開発サーバーを起動
	bun run dev

build: ## プロダクションビルド
	bun run build

## 品質チェック
lint: ## Biome lint チェック
	bunx biome check .

lint-fix: ## Biome lint 自動修正
	bunx biome check --write .

format: ## Biome フォーマット
	bunx biome format --write .

typecheck: ## TypeScript 型チェック
	bun run --filter '*' typecheck

test: ## テスト実行
	bun test

test-watch: ## テスト (watch モード)
	bun test --watch

test-coverage: ## テスト + カバレッジ
	bun test --coverage

check: lint typecheck test ## lint + typecheck + test 一括実行
	@echo "✅ All checks passed"

lint-check: ## Biome lint チェック (CI用、修正しない)
	bunx biome check .
	bunx biome format --check .

## セットアップ
install: ## 依存関係インストール
	bun install

install-ci: ## CI用インストール (frozen lockfile, lifecycle scripts無効 + 信頼パッケージのみ実行)
	bun install --frozen-lockfile --ignore-scripts
	bun pm trust @biomejs/biome --all
	bunx @biomejs/biome --version

clean: ## ビルド成果物を削除
	rm -rf packages/web/.next
	rm -rf packages/core/tsconfig.tsbuildinfo
	rm -rf packages/web/tsconfig.tsbuildinfo
	rm -rf tsconfig.tsbuildinfo

## ヘルプ
help: ## このヘルプを表示
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
