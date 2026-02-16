# Raindary - 自分語り要約

Raindrop.ioに保存した記事を自動で取り込み、AI要約で「読んだフリができる自分語り要約」を生成するツール

## 概要

技術記事を大量に保存するが読み切れないエンジニアのための、Claude APIを使った自動要約システム。
複数のトーン（neutral、snarky、enthusiastic、casual）で要約を生成し、コストも可視化します。

## 技術スタック

### フロントエンド

- **Next.js 16**: App Router, Server Components, Server Actions
- **React 19**: 最新のReactフレームワーク
- **TypeScript**: 型安全な開発
- **Tailwind CSS**: ユーティリティファーストCSS

### バックエンド

- **Auth.js v5**: Raindrop.io OAuth認証
- **Drizzle ORM**: 型安全なSQL操作
- **PostgreSQL**: リレーショナルデータベース（Supabase）
- **Inngest**: イベント駆動型の非同期処理

### AI/ML

- **Anthropic Claude API**:
  - Claude Sonnet 4.5: 事実抽出と要約生成（高品質）
  - Claude Haiku 4.5: 軽量タスク用（高速・低コスト）

### インフラ

- **Docker & Docker Compose**: コンテナ化されたローカル開発環境
- **Python + trafilatura**: Web記事の本文抽出

## 特徴

### コア機能

- **Raindrop.io連携**: OAuth認証でRaindrop.ioのブックマークを自動取り込み
- **AI要約生成**: Claude API（Sonnet 4.5）による高品質な記事要約
- **複数のトーン**: neutral（客観的）、snarky（毒舌）、enthusiastic（熱量高め）、casual（カジュアル）の4種類
- **2段階AI処理**: 記事抽出 → 事実抽出 → 要約生成の効率的なパイプライン
- **コスト追跡**: API使用料を自動計算・統計ダッシュボードで可視化

### ユーザー体験

- **検索機能**: 記事タイトル、要約内容、トーンでリアルタイム検索
- **コレクションフィルター**: Raindrop.ioのコレクション別に記事を整理・絞り込み
- **統計ダッシュボード**: 記事数、要約数、月間コスト、トーン分布を可視化
- **共有機能**: 要約を公開URLで外部共有（公開/非公開切り替え可能）
- **要約詳細ページ**: 自分の要約を詳しく閲覧（公開状態も確認可能）

### 開発者体験

- **非同期処理**: Inngestによるバックグラウンド処理で快適なUX
- **マルチユーザー対応**: 各ユーザーのデータを安全に分離
- **完全Docker化**: ローカル開発環境を簡単セットアップ
- **監視機能**: ヘルスチェックエンドポイント、Vercel Speed Insights & Analytics統合

## アーキテクチャ

```
┌─────────────┐
│   Browser   │
└──────┬──────┘
       │
       ↓
┌─────────────────────────────────────┐
│  Next.js App (web container)        │
│  - Server Components                │
│  - Auth.js (Raindrop OAuth)         │
│  - API Routes                       │
└──────┬──────────────────────────────┘
       │
       ↓
┌─────────────────────────────────────┐
│  Inngest (inngest container)        │
│  - raindrop-import                  │
│  - raindrop-extract                 │
│  - raindrop-summarize               │
└──────┬──────────────────────────────┘
       │
       ├─────→ PostgreSQL (db container)
       │       - ユーザーデータ
       │       - 記事・要約データ
       │       - API使用量
       │
       ├─────→ Extract Service (extract container)
       │       - Python + trafilatura
       │       - 記事本文抽出
       │
       └─────→ Anthropic Claude API
               - Haiku: 事実抽出
               - Sonnet: 要約生成
```

## セットアップ

詳細なセットアップ手順は **[docs/SETUP.md](./docs/SETUP.md)** を参照してください。

### クイックスタート

```bash
# 1. 環境変数を設定
cp .env.local.example .env.local
# .env.localを編集して以下を設定:
# - AUTH_SECRET: openssl rand -hex 32
# - ENCRYPTION_KEY: openssl rand -hex 32
# - AUTH_RAINDROP_ID/SECRET: Raindrop.io App Management
# - ANTHROPIC_API_KEY: Anthropic Console

# 2. Docker Composeで起動
docker compose up --build

# 3. マイグレーションを実行（別ターミナルで）
docker compose exec web npm run db:migrate

# 4. ブラウザでアクセス
# http://localhost:3000
```

### アクセス先

- **Next.js**: http://localhost:3000
- **Inngest Dev Server**: http://localhost:8288
- **Extract API**: http://localhost:8000
- **PostgreSQL**: localhost:5432

## 使い方

### 1. ログイン

- http://localhost:3000/login にアクセス
- 「Raindrop.ioでログイン」をクリック
- Raindrop.ioで認証

### 2. 記事を取り込む

- ダッシュボードから「記事一覧」へ移動
- 「今すぐ取り込む」ボタンをクリック
- Raindrop.ioのブックマークが自動取り込まれます

### 3. 要約を確認

- 記事の取り込みと同時に、自動で要約が生成されます
- 「要約一覧」から生成された要約を確認
- トーン、評価、コストなどの情報も表示されます

### 4. Inngest Dev Serverで進捗確認

- http://localhost:8288 にアクセス
- 実行中・完了したジョブの状態を確認できます

## プロジェクト構造

```
RainDrop_AI/
├── docs/                          # ドキュメント
│   ├── SETUP.md                  # セットアップガイド
│   ├── DEPLOYMENT.md             # デプロイガイド
│   └── データベース設計.md        # DB設計ドキュメント
├── drizzle/                       # データベースマイグレーション
│   └── migrations/
├── services/                      # バックエンドサービス
│   └── extract/                  # Python記事抽出サービス
│       ├── Dockerfile
│       ├── Dockerfile.prod       # 本番用Dockerfile
│       ├── main.py
│       └── requirements.txt
├── public/                        # 静的ファイル
│   └── logo.png                  # アプリロゴ
├── src/
│   ├── app/                       # Next.js App Router
│   │   ├── (auth)/               # 認証関連ページ
│   │   │   └── login/
│   │   ├── (dashboard)/          # ダッシュボードページ
│   │   │   ├── dashboard/        # ダッシュボード
│   │   │   ├── raindrops/        # 記事一覧
│   │   │   ├── summaries/        # 要約一覧・詳細
│   │   │   └── stats/            # 統計ダッシュボード
│   │   ├── share/[id]/           # 公開共有ページ
│   │   ├── api/                  # APIルート
│   │   │   ├── health/          # ヘルスチェック
│   │   │   └── inngest/         # Inngest webhook
│   │   ├── icon.png              # Favicon
│   │   └── layout.tsx            # ルートレイアウト
│   ├── db/                       # データベース設定
│   │   ├── schema.ts             # Drizzleスキーマ定義
│   │   ├── migrations/           # マイグレーションSQL
│   │   └── index.ts
│   ├── inngest/                  # Inngest関数
│   │   ├── client.ts
│   │   └── functions/
│   │       ├── raindrop-import.ts    # 記事取り込み
│   │       ├── raindrop-extract.ts   # 記事抽出
│   │       └── raindrop-summarize.ts # 要約生成
│   └── lib/                      # ユーティリティ
│       ├── anthropic.ts          # Claude API client
│       ├── crypto.ts             # トークン暗号化
│       ├── raindrop-api.ts       # Raindrop.io API client
│       └── cost-tracking.ts      # コスト計算
├── auth.ts                       # Auth.js設定
├── docker-compose.yml            # Docker Compose設定
├── Dockerfile                    # Webアプリコンテナ
├── drizzle.config.ts             # Drizzle設定
├── DEPLOYMENT_CHECKLIST.md       # デプロイチェックリスト
└── package.json
```

## 開発

### ローカル開発サーバー

```bash
# バックグラウンドで起動
docker compose up -d

# ログ確認
docker compose logs -f web

# 特定のサービスを再起動
docker compose restart web

# 停止
docker compose down

# 完全削除（DBデータも削除）
docker compose down -v
```

### データベース操作

```bash
# マイグレーション生成（スキーマからSQLを生成）
docker compose exec web npm run db:generate

# マイグレーション実行（DBにテーブルを作成）
docker compose exec web npm run db:migrate

# データベースに直接接続
docker compose exec db psql -U postgres -d raindary
```

### Inngest関数の開発

Inngest Dev Serverで関数の実行状態を確認:

- http://localhost:8288

手動でイベントをトリガー:

```bash
curl -X POST http://localhost:3000/api/import/trigger \
  -H "Content-Type: application/json"
```

### テスト

```bash
# ユニットテストを実行
docker compose exec web npm test

# カバレッジレポート付きで実行
docker compose exec web npm run test:coverage

# Watchモードで実行（開発中）
docker compose exec web npm run test:watch
```

#### テストカバレッジ

コアロジックのユニットテストカバレッジ:

| ファイル                  | カバレッジ | テスト内容                                  |
| ------------------------- | ---------- | ------------------------------------------- |
| `src/lib/crypto.ts`       | 100%       | トークン暗号化・復号化                      |
| `src/lib/raindrop.ts`     | 100%       | Raindrop API クライアント                   |
| `src/lib/utils.ts`        | 100%       | Tailwind CSS ユーティリティ                 |
| `src/lib/cost-tracker.ts` | 47%        | コスト計算（track\*関数は統合テスト）       |
| `src/lib/anthropic.ts`    | 28%        | トークン推定（sendJsonMessageは統合テスト） |
| `src/inngest/prompts/`    | 100%       | プロンプト生成ロジック                      |

**合計: 113 テスト, 全てパス**

### Lint & Format

```bash
# ESLintを実行
docker compose exec web npm run lint

# ESLintで自動修正
docker compose exec web npm run lint:fix

# Prettierでフォーマット
docker compose exec web npm run format

# フォーマットチェック（CIで使用）
docker compose exec web npm run format:check

# 型チェック
docker compose exec web npm run type-check
```

#### コード品質ツール

- **ESLint**: TypeScript/React/Next.jsのコード品質チェック
- **Prettier**: コードフォーマッター（Tailwind CSS対応）
- **TypeScript**: 静的型チェック
- **VSCode設定**: 保存時の自動フォーマット・自動修正

設定ファイル:

- `.eslintrc.json`: ESLint設定
- `.prettierrc`: Prettier設定
- `.vscode/settings.json`: VSCode設定
- `.vscode/extensions.json`: 推奨拡張機能

### デバッグ

各サービスのログを確認:

```bash
# Webアプリ
docker compose logs -f web

# データベース
docker compose logs -f db

# Extract Service
docker compose logs -f extract

# Inngest
docker compose logs -f inngest
```

## 環境変数

`.env.local`に設定が必要な主な環境変数:

```bash
# Next.js
NEXTAUTH_URL=http://localhost:3000
NODE_ENV=development

# Auth.js
AUTH_SECRET=<openssl rand -hex 32>

# Raindrop.io OAuth
AUTH_RAINDROP_ID=<Raindrop Client ID>
AUTH_RAINDROP_SECRET=<Raindrop Client Secret>

# Database
DATABASE_URL=postgresql://postgres:postgres@db:5432/raindary

# Anthropic Claude
ANTHROPIC_API_KEY=<sk-ant-で始まるAPIキー>

# Token Encryption
ENCRYPTION_KEY=<openssl rand -hex 32>
```

詳細は [docs/SETUP.md](./docs/SETUP.md) を参照してください。

## デプロイ

本番環境へのデプロイ手順は **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)** を参照してください。

### デプロイ構成

- **Next.jsアプリ**: Vercel（無料プラン対応）
- **データベース**: Supabase (PostgreSQL 無料プラン)
- **バックグラウンドジョブ**: Inngest Cloud（無料プラン対応）
- **Extract サービス**: Render（無料プラン、Python/FastAPI）

### クイックデプロイ

1. **Supabase**: プロジェクト作成、DATABASE_URLを取得
2. **Inngest Cloud**: アプリ作成、Event KeyとSigning Keyを取得
3. **Raindrop.io**: Redirect URLを本番URLに変更
4. **Vercel**: GitHubリポジトリをインポート、環境変数を設定
5. デプロイ完了！

詳細な手順は [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) を参照してください。

## ライセンス

MIT License

## 作成者

Minoru Kitayama
