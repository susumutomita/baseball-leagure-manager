.PHONY: start dev build lint lint-fix lint-check format typecheck test test-watch test-coverage check before-commit clean install install-ci

BIOME := ./node_modules/.bin/biome

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
	$(BIOME) check .

lint-fix: ## Biome lint 自動修正
	$(BIOME) check --write .

format: ## Biome フォーマット
	$(BIOME) format --write .

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

before-commit: format lint-fix typecheck test-coverage ## コミット前チェック (自動修正 + typecheck + テスト + カバレッジ)
	@echo "✅ Ready to commit"

lint-check: ## Biome lint + format チェック (CI用、修正しない)
	$(BIOME) check .
	$(BIOME) format .

## セットアップ
install: ## 依存関係インストール
	bun install

install-ci: ## CI用インストール (install後にlockfile差分チェック)
	bun install
	git diff --exit-code bun.lock || (echo "ERROR: bun.lock is out of date. Run 'bun install' locally and commit bun.lock." && exit 1)

clean: ## ビルド成果物を削除
	rm -rf packages/web/.next
	rm -rf packages/core/tsconfig.tsbuildinfo
	rm -rf packages/web/tsconfig.tsbuildinfo
	rm -rf tsconfig.tsbuildinfo

## ヘルプ
help: ## このヘルプを表示
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'
