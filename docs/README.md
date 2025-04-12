# 草野球リーグマネージャー ドキュメント

このドキュメントでは、草野球リーグマネージャーの詳細な使用方法、アーキテクチャ、APIリファレンスについて説明します。

## 目次

1. [システム概要](overview.md)
2. [アーキテクチャ](architecture.md)
3. [開発環境のセットアップ](development.md)
4. [APIリファレンス](api.md)
5. [デプロイガイド](deployment.md)
6. [運用ガイド](operations.md)
7. [トラブルシューティング](troubleshooting.md)

## クイックスタート

詳細な手順は各セクションを参照してください。基本的な使い方は以下の通りです：

1. リポジトリをクローン：
   ```bash
   git clone https://github.com/susumutomita/baseball-leagure-manager.git
   cd baseball-leagure-manager
   ```

2. 環境変数の設定：
   ```bash
   cp .env.example .env
   # .envファイルを編集して必要な環境変数を設定
   ```

3. Taskfileを使用して開発環境を起動：
   ```bash
   task install
   task dev
   ```

4. ブラウザでアクセス：
   - アプリケーション: http://localhost:3000
   - KeyCloak: http://localhost:8080

## システム要件

- Docker と Docker Compose
- Kubernetes (本番環境)
- Terraform (クラウドデプロイ用)

## 主な機能

- マルチテナント構造
- 自動マッチング
- 自動会計
- 日程調整
- チーム・選手管理
- リーグ管理
- 課金システム

各機能の詳細については[システム概要](overview.md)を参照してください。
