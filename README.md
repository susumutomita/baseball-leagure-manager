# 草野球リーグマネージャー (Baseball League Manager)

草野球チーム向けのリーグ戦・チーム管理システムです。自動マッチング、自動会計、日程調整などの運営業務をAIが支援します。

## 主な機能

- **マルチテナント構造**: 複数の団体が独立して利用できるSaaSアーキテクチャ
- **自動マッチング**: チーム間の公平な対戦カードをAIが生成
- **自動会計**: 収支管理と予算提案をAIが自動生成
- **日程調整**: 会場の空き状況とチームの希望を考慮した最適なスケジュールをAIが作成
- **チーム・選手管理**: チーム情報、選手名簿、統計データの管理
- **リーグ管理**: 複数シーズン、複数リーグの管理と成績集計
- **課金システム**: Stripeを利用した支払い処理

## 技術スタック

- **バックエンド**: Ruby on Rails 7.1
- **データベース**: PostgreSQL
- **キャッシュ/ジョブキュー**: Redis, Sidekiq
- **認証**: KeyCloak
- **コンテナ化**: Docker, Kubernetes
- **インフラ**: Terraform (AWS/GCP/Azure対応)

## 必要条件

- Docker と Docker Compose
- Kubernetes (本番環境)
- Terraform (クラウドデプロイ用)

## クイックスタート

Taskfileを使用して簡単にセットアップできます：

```bash
# 依存関係のインストール
task install

# 開発環境の起動
task dev

# テストの実行
task test

# 本番環境のビルド
task build

# クラウドへのデプロイ
task deploy:aws  # または deploy:gcp, deploy:azure
```

詳細な手順は[ドキュメント](docs/README.md)を参照してください。

## 開発環境のセットアップ

Docker Composeを使用して開発環境を起動します：

```bash
docker-compose up
```

アプリケーションは http://localhost:3000 でアクセスできます。
KeyCloakは http://localhost:8080 で実行されます。

## 環境変数

`.env.example`ファイルを`.env`にコピーして必要な環境変数を設定してください。主な環境変数は以下の通りです：

- データベース設定（POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB）
- KeyCloak設定（KEYCLOAK_ADMIN, KEYCLOAK_ADMIN_PASSWORD, KEYCLOAK_REALM, KEYCLOAK_CLIENT_ID, KEYCLOAK_CLIENT_SECRET）
- Stripe設定（STRIPE_API_KEY）

詳細は`.env.example`ファイルを参照してください。

## テスト

テストを実行するには：

```bash
docker-compose run --rm web bundle exec rspec
```

## デプロイ

Kubernetesへのデプロイ方法については[デプロイガイド](docs/deployment.md)を参照してください。

## ライセンス

MITライセンスの下で公開されています。詳細は[LICENSE](LICENSE)ファイルを参照してください。
