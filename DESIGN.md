# DESIGN.md — mound

## 1. Visual Theme & Atmosphere

- **Clean & Professional**: AWS Cloudscape Design System ベース
- **Light theme 固定**: ダークモードは使わない
- **情報密度**: 必要十分。詰め込みすぎず、余白を活かす
- **ランディングページ**: テキスト少なめ、ビジュアル重視。プロダクトっぽく
- **管理画面**: Cloudscape AppLayout + SideNavigation。業務ツールとしての信頼感

## 2. Color Palette & Roles

Cloudscape のデフォルトカラーを使用。カスタムカラーは使わない。

| Role | Token | Hex | Usage |
|------|-------|-----|-------|
| Background | `$color-background-layout-main` | `#f2f3f3` | ページ背景 |
| Surface | `$color-background-container-content` | `#ffffff` | カード・コンテナ |
| Primary | `$color-text-interactive-default` | `#0972d3` | ボタン・リンク・アクセント |
| Primary hover | `$color-background-button-primary-active` | `#033160` | ボタンホバー |
| Text primary | `$color-text-body-default` | `#000716` | 本文テキスト |
| Text secondary | `$color-text-body-secondary` | `#414d5c` | 補足テキスト |
| Success | `$color-text-status-success` | `#037f0c` | 成功・参加 |
| Error | `$color-text-status-error` | `#d91515` | エラー・不参加 |
| Warning | `$color-text-status-warning` | `#8d6605` | 警告・未定 |
| Border | `$color-border-divider-default` | `#e9ebed` | 区切り線 |

## 3. Typography Rules

- **Font**: Cloudscape デフォルト（Open Sans / system font stack）
- **見出し**: Cloudscape Header component の variant で制御
  - `h1`: ページタイトル（1ページに1つ）
  - `h2`: セクションタイトル（Container header）
  - `h3`: サブセクション
- **本文**: `Box variant="p"` — 14px
- **補足**: `Box color="text-body-secondary" fontSize="body-s"` — 12px
- **コード**: `Box variant="code"` — monospace

## 4. Component Stylings

### ボタン
- **Primary**: 青背景白文字。1画面に1つが理想
- **Normal**: 白背景青文字。セカンダリアクション
- **Link**: テキストのみ。キャンセル・戻るなど
- **ボタンのサイズ**: Cloudscape デフォルト。カスタムサイズは使わない

### カード / Container
- **白背景 + 薄いボーダー + 角丸**
- **Header**: `Header variant="h2"` with optional `description`
- **ネストは1段まで**: Container の中の Container は避ける

### テーブル
- **Cloudscape Table**: `variant="full-page"` or `variant="embedded"`
- **ソート・フィルタ**: Cloudscape 標準機能を使う
- **空状態**: `empty` prop でメッセージ表示

### フォーム
- **FormField**: ラベル + 入力の組み合わせ
- **バリデーション**: `errorText` prop でインラインエラー
- **送信ボタン**: フォーム右下に配置

### モーダル
- **Modal**: 作成・編集アクション
- **size="medium"**: デフォルト
- **footer**: 右寄せで「キャンセル」「実行」ボタン

### ナビゲーション
- **TopNavigation**: ロゴ + ユーザーメニュー
- **SideNavigation**: メニュー項目。セクション分け。AppLayout に配置
- **BreadcrumbGroup**: ページ階層表示

## 5. Layout Principles

### 間隔
- **セクション間**: `SpaceBetween size="xxl"` (32px)
- **カード内要素間**: `SpaceBetween size="l"` (20px)
- **フォームフィールド間**: `SpaceBetween size="l"` (20px)
- **テキスト間**: `SpaceBetween size="xs"` (8px)

### グリッド
- **ColumnLayout**: 2列 or 3列。4列は画面幅に応じて
- **レスポンシブ**: Cloudscape が自動で1列に折り返す

### ページ構成
- **管理画面**: `ContentLayout` + `header` (BreadcrumbGroup + Header)
- **ランディング**: `ContentLayout` + hero header + sections
- **LIFF**: カスタムレイアウト（Cloudscape なし、軽量）

## 6. Depth & Elevation

- **Container**: Cloudscape デフォルトシャドウ（薄いドロップシャドウ）
- **Modal**: overlay + 強いシャドウ（Cloudscape デフォルト）
- **Popover / Dropdown**: Cloudscape デフォルト
- **カスタムシャドウは使わない**

## 7. Do's and Don'ts

### Do
- Cloudscape コンポーネントを使う（HTML + カスタムCSS は避ける）
- `SpaceBetween` で間隔を統一する
- `Header` の `description` prop で補足説明を入れる
- ランディングは短い文で要点を伝える。1文15文字以内が理想
- StatusIndicator で状態を色分け表示する
- フォームは Modal で完結させる（ページ遷移しない）

### Don't
- カスタム CSS module（`.module.css`）を作らない
- Tailwind のユーティリティクラスを Cloudscape コンポーネントに混ぜない
- ダークテーマ用のスタイルを書かない（ライト固定）
- グラデーション背景・backdrop-filter を使わない
- 1つのセクションに3文以上のテキストを詰め込まない
- ネストされた Container（Container の中の Container）を使わない

## 8. Responsive Behavior

- **ブレークポイント**: Cloudscape が自動処理
- **ColumnLayout**: 画面幅に応じて列数が自動で減る
- **SideNavigation**: 狭い画面でハンバーガーに折りたたみ（AppLayout 標準）
- **LIFF ページ**: モバイル前提。Tailwind で `p-4` 程度のパディング
- **テーブル**: 横スクロール可（Cloudscape Table 標準）

## 9. ランディングページ設計原則

- **文字を減らす**: 1セクション = 見出し + 1〜2行の説明
- **数字で語る**: 「10分の1」「5分で導入」など具体的な数値
- **課題→解決の流れ**: 悩み → 機能 → 導入ステップ → 料金
- **CTA は明確に**: 「無料ではじめる」ボタンをヒーローとフッターに
- **Cloudscape コンポーネントのみ**: Container, ColumnLayout, Box, Button
- **画像なし（現時点）**: テキストとレイアウトで勝負。将来スクショ追加可

## 10. Agent Prompt Guide

### ページ作成時
```
DESIGN.md を参照して Cloudscape Design System のコンポーネントのみで構成してください。
カスタム CSS は使わないでください。
```

### ランディングページ
```
DESIGN.md のセクション9に従い、文字は最小限にしてください。
1セクション = 見出し + 最大2行。数字で語ってください。
```

### 管理画面
```
Cloudscape AppLayout + ContentLayout のパターンに従ってください。
BreadcrumbGroup + Header + Container の構成です。
```
