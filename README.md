# Raindary - 自分語り要約

Raindrop.ioに保存した記事を自動で取り込み、AI要約で「読んだフリができる自分語り要約」を生成するツール

## 概要

技術記事を大量に保存するが読み切れないエンジニアのための、Claude APIを使った自動要約システム。
複数のトーン（casual、professional、enthusiastic）で要約を生成し、コストも可視化します。

## 技術スタック

### フロントエンド

- **Next.js 15**: App Router, Server Components, Server Actions
- **TypeScript**: 型安全な開発
- **Tailwind CSS**: ユーティリティファーストCSS
- **shadcn/ui**: 再利用可能なUIコンポーネント

### バックエンド

- **Auth.js v5**: Raindrop.io OAuth認証
- **Drizzle ORM**: 型安全なSQL操作
- **PostgreSQL**: リレーショナルデータベース
- **Inngest**: イベント駆動型の非同期処理

### AI/ML

- **Anthropic Claude API**:
  - Claude 3.5 Haiku: 事実抽出（高速・低コスト）
  - Claude 3.5 Sonnet: 要約生成（高品質）

### インフラ

- **Docker & Docker Compose**: コンテナ化されたローカル開発環境
- **Python + trafilatura**: Web記事の本文抽出

## 特徴

- **Raindrop.io連携**: OAuth認証でRaindrop.ioのブックマークを自動取り込み
- **AI要約生成**: Claude APIによる高品質な記事要約
- **複数のトーン**: casual（カジュアル）、professional（プロフェッショナル）、enthusiastic（熱量高め）の3種類
- **2段階AI処理**: 事実抽出（Haiku）→ 要約生成（Sonnet）の効率的なパイプライン
- **コスト追跡**: API使用料を自動計算・可視化
- **非同期処理**: Inngestによるバックグラウンド処理で快適なUX
- **マルチユーザー対応**: 各ユーザーのデータを安全に分離
- **完全Docker化**: ローカル開発環境を簡単セットアップ

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
├── docs/                      # ドキュメント
│   └── SETUP.md              # セットアップガイド
├── drizzle/                   # データベースマイグレーション
│   └── migrations/
├── extract-service/           # Python記事抽出サービス
│   ├── Dockerfile
│   ├── main.py
│   └── requirements.txt
├── src/
│   ├── app/                   # Next.js App Router
│   │   ├── (auth)/           # 認証関連ページ
│   │   ├── (dashboard)/      # ダッシュボードページ
│   │   └── api/              # APIルート
│   ├── components/           # Reactコンポーネント
│   ├── db/                   # データベース設定
│   │   ├── schema.ts         # Drizzleスキーマ定義
│   │   └── index.ts
│   ├── inngest/              # Inngest関数
│   │   ├── client.ts
│   │   └── functions/
│   │       ├── raindrop-import.ts
│   │       ├── raindrop-extract.ts
│   │       └── raindrop-summarize.ts
│   └── lib/                  # ユーティリティ
│       ├── anthropic.ts      # Claude API client
│       ├── crypto.ts         # トークン暗号化
│       ├── raindrop-api.ts   # Raindrop API client
│       └── cost-tracking.ts  # コスト計算
├── auth.ts                   # Auth.js設定
├── docker-compose.yml        # Docker Compose設定
├── Dockerfile                # Webアプリコンテナ
├── drizzle.config.ts         # Drizzle設定
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
docker compose exec db psql -U postgres -d raindrop_ai
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
DATABASE_URL=postgresql://postgres:postgres@db:5432/raindrop_ai

# Anthropic Claude
ANTHROPIC_API_KEY=<sk-ant-で始まるAPIキー>

# Token Encryption
ENCRYPTION_KEY=<openssl rand -hex 32>
```

詳細は [docs/SETUP.md](./docs/SETUP.md) を参照してください。

## デプロイ

本番環境へのデプロイ手順は **[docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md)** を参照してください。

### デプロイ構成

- **Next.jsアプリ**: Vercel
- **データベース**: Supabase (PostgreSQL)
- **バックグラウンドジョブ**: Inngest Cloud
- **Extract サービス**: Next.js API Routes

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
