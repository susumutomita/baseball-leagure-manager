# セキュリティポリシー

## 脆弱性の報告

セキュリティ脆弱性を発見した場合は、公開 Issue ではなく以下に直接連絡してください:

- メール: security@mound.dev

48時間以内に確認の返信をします。

## セキュリティ対策

### 認証・認可
- **LINE OAuth 2.0** による認証（CSRF 対策として state パラメータ + nonce cookie を使用）
- **全 API ルート** に `requireAuth()` による認証チェック
- **チーム所有権検証**: 全エンドポイントで `authResult.team_id` と対象リソースの `team_id` を照合
- **ロールベースアクセス制御**: SUPER_ADMIN > ADMIN > MEMBER の階層。ロール変更は SUPER_ADMIN のみ

### トークンセキュリティ
- **RSVP トークン**: HMAC-SHA256 署名 + タイミングセーフ比較
- **招待トークン**: HMAC-SHA256 署名 + 有効期限 + 使用回数制限
- **セッション Cookie**: HttpOnly, Secure, SameSite=Lax

### データ保護
- **入力検証**: 全ユーザー入力を Zod スキーマで検証
- **SQL インジェクション防止**: Supabase クライアントのパラメータ化クエリ使用
- **XSS 防止**: React の自動エスケープ + dangerouslySetInnerHTML 不使用
- **CSRF 防止**: ミドルウェアで Origin ヘッダー検証（POST/PATCH/PUT/DELETE）
- **エラー情報漏洩防止**: クライアントには汎用メッセージ、詳細はサーバーログのみ

### インフラ
- **Supabase RLS**: Row Level Security によるデータベースレベルのアクセス制御
- **環境変数**: シークレットは全て環境変数で管理、ハードコード禁止
- **監査ログ**: 全状態遷移・データ変更を `audit_logs` テーブルに記録

## 依存関係の管理

- `bun.lock` でバージョン固定
- 定期的な依存関係の更新と脆弱性チェック
