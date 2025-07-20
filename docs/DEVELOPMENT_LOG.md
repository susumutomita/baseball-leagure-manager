# 開発ログ - AI時代の草野球リーグ管理システム

## 実装完了項目（2025-06-14）

### 1. 基本環境整備 ✅
- TypeScriptの型チェック設定（`npm run typecheck`コマンド追加）
- ESLint設定の最適化
- 型定義ファイルの作成（`app/javascript/types/index.d.ts`）
- package.jsonへのtypecheckスクリプト追加

### 2. データベース設計 ✅
以下のマイグレーションファイルを作成：
1. `20250614000001_create_organizations.rb` - マルチテナント基盤
2. `20250614000002_create_users.rb` - KeyCloak連携ユーザー
3. `20250614000003_create_teams.rb` - 拡張チーム情報
4. `20250614000004_create_players.rb` - 選手統計付き
5. `20250614000005_create_leagues.rb` - AI設定付きリーグ
6. `20250614000006_create_matches.rb` - AI分析データ付き試合
7. `20250614000007_create_transactions.rb` - Stripe連携決済
8. `20250614000008_create_ai_matching_configs.rb` - AIマッチング設定
9. `20250614000009_create_ai_schedule_optimizations.rb` - AI最適化履歴
10. `20250614000010_create_player_statistics.rb` - 選手詳細統計
11. `20250614000011_create_team_analytics.rb` - チーム分析
12. `20250614000012_create_weather_forecasts.rb` - 天候予測
13. `20250614000013_create_umpire_assignments.rb` - 審判割り当て
14. `20250614000014_create_subscription_plans.rb` - 課金プラン
15. `20250614000015_create_organization_subscriptions.rb` - 組織契約

### 3. マルチテナント機能 ✅
#### モデル
- `app/models/organization.rb` - 組織モデル
- `app/models/user.rb` - ユーザーモデル（KeyCloak連携）
- `app/models/concerns/tenant_scoped.rb` - テナントスコープConcern
- 既存モデルへの`acts_as_tenant`追加

#### コントローラー
- `app/controllers/application_controller.rb` - テナント設定
- `app/controllers/organizations/base_controller.rb` - 組織内操作基底
- `app/controllers/api/v1/base_controller.rb` - API基底
- `app/controllers/organizations_controller.rb` - 組織管理
- `app/controllers/auth_controller.rb` - KeyCloak認証
- `app/controllers/concerns/keycloak_authenticatable.rb` - 認証Concern

#### 設定
- `config/initializers/acts_as_tenant.rb`
- `config/initializers/keycloak.rb`
- `config/routes.rb` - 認証ルートと組織スコープルート追加

### 4. AIマッチングエンジン ✅
#### モデル
- `app/models/ai_matching_config.rb` - AI設定
- `app/models/match_proposal.rb` - マッチング提案
- `app/models/match_proposal_detail.rb` - 提案詳細
- `app/models/team_strength_metric.rb` - チーム戦力指標
- `app/models/season.rb` - シーズン管理
- `app/models/player_stat.rb` - 選手統計

#### AIサービス
- `app/services/ai/matching_engine.rb` - メインエンジン
- `app/services/ai/team_strength_analyzer.rb` - 戦力分析
- `app/services/ai/fairness_calculator.rb` - 公平性計算
- `app/services/ai/travel_distance_optimizer.rb` - 移動距離最適化
- `app/services/ai/schedule_constraint_checker.rb` - 制約チェック
- `app/services/ai/open_ai_client.rb` - OpenAI連携
- `app/services/ai/claude_client.rb` - Claude連携（スタブ）

#### ジョブ
- `app/jobs/generate_match_proposals_job.rb` - 提案生成
- `app/jobs/optimize_schedule_job.rb` - スケジュール最適化

#### コントローラー
- `app/controllers/organizations/ai_matching_configs_controller.rb`
- `app/controllers/organizations/match_proposals_controller.rb`

## 未実装項目（TODO）

### 1. 自動会計・予算最適化システム
- [ ] 収支予測AI
- [ ] 予算配分最適化
- [ ] 自動請求書生成
- [ ] 支払いリマインダー

### 2. AIスケジューラー ✅
#### モデル
- `app/models/venue.rb` - 会場管理（Geocoding対応）
- `app/models/venue_availability.rb` - 会場利用可能性
- `app/models/schedule_conflict.rb` - スケジュール競合（7種類の競合タイプ）
- `app/models/rescheduled_match.rb` - 延期試合記録（13種類の延期理由）

#### AIサービス
- `app/services/ai/smart_scheduler.rb` - メインのスケジューリング
- `app/services/ai/weather_aware_scheduler.rb` - 天候考慮（OpenWeather API連携）
- `app/services/ai/venue_optimizer.rb` - 会場最適配置
- `app/services/ai/reschedule_engine.rb` - 延期試合の再スケジューリング
- `app/services/ai/conflict_resolver.rb` - 競合解決

#### ドキュメント
- `docs/ai_scheduler_usage.md` - 使用方法とAPI仕様

### 3. 選手パフォーマンス分析AI
- [ ] 打撃・投球フォーム分析（動画解析）
- [ ] 成績予測モデル
- [ ] 怪我リスク予測
- [ ] 最適打順・守備位置提案

### 4. チーム戦力自動分析システム
- [ ] リアルタイム戦力評価
- [ ] 対戦相性分析
- [ ] 弱点・強み可視化
- [ ] 補強ポイント提案

### 5. 天候予測と試合可否判断AI
- [ ] 気象API連携
- [ ] 試合実施可否の自動判定
- [ ] 代替日程の自動提案
- [ ] グラウンドコンディション予測

### 6. 審判アサインメント最適化
- [ ] 審判スケジュール管理
- [ ] 公平な割り当てアルゴリズム
- [ ] パフォーマンス評価システム
- [ ] 報酬自動計算

### 7. Stripe課金システム ✅
#### モデル
- `app/models/subscription_plan.rb` - 料金プラン（基本/プロ/エンタープライズ）
- `app/models/organization_subscription.rb` - 組織のサブスクリプション
- `app/models/payment_method.rb` - 支払い方法
- `app/models/invoice.rb` - 請求書
- `app/models/invoice_item.rb` - 請求書明細
- `app/models/usage.rb` - 使用量記録

#### サービス
- `app/services/billing/stripe_service.rb` - Stripe APIラッパー
- `app/services/billing/subscription_manager.rb` - サブスクリプション管理
- `app/services/billing/payment_processor.rb` - 支払い処理
- `app/services/billing/invoice_generator.rb` - 請求書生成
- `app/services/billing/usage_tracker.rb` - 使用量追跡

#### コントローラー
- `app/controllers/organizations/billing_controller.rb` - 課金ダッシュボード
- `app/controllers/organizations/subscriptions_controller.rb` - サブスクリプション管理
- `app/controllers/organizations/payment_methods_controller.rb` - 支払い方法管理
- `app/controllers/organizations/invoices_controller.rb` - 請求書管理
- `app/controllers/webhooks/stripe_webhooks_controller.rb` - Webhookイベント処理

### 8. フロントエンド実装
- [ ] React/TypeScriptでのSPA構築
- [ ] リアルタイムダッシュボード
- [ ] モバイルレスポンシブ対応
- [ ] PWA化

### 9. 通知システム
- [ ] 試合リマインダー
- [ ] 天候アラート
- [ ] 支払い通知
- [ ] LINE/Slack連携

### 10. レポート機能
- [ ] シーズンサマリー自動生成
- [ ] 個人成績表
- [ ] チーム分析レポート
- [ ] PDFエクスポート

## 環境設定メモ

### 必要な環境変数（.env）
```
# Database
POSTGRES_USER=
POSTGRES_PASSWORD=
POSTGRES_DB=baseball_league_manager_development

# KeyCloak
KEYCLOAK_ADMIN=
KEYCLOAK_ADMIN_PASSWORD=
KEYCLOAK_REALM=baseball-league
KEYCLOAK_CLIENT_ID=baseball-app
KEYCLOAK_CLIENT_SECRET=

# Stripe
STRIPE_API_KEY=
STRIPE_WEBHOOK_SECRET=

# AI Services
OPENAI_API_KEY=
ANTHROPIC_API_KEY=

# Weather API
WEATHER_API_KEY=
```

### コマンド
```bash
# 型チェック
npm run typecheck

# リンター
npm run lint

# テスト
bundle exec rspec

# マイグレーション
bundle exec rails db:migrate

# サーバー起動
bundle exec rails server
```

## 次回作業時の注意点
1. PostgreSQLを起動してからマイグレーションを実行
2. 環境変数を設定してからサーバーを起動
3. KeyCloakの設定が必要
4. OpenAI APIキーの設定が必要