# セットアップガイド

このドキュメントでは、Raindrop AIの初回セットアップ手順を詳しく説明します。

## 目次

1. [事前準備](#事前準備)
2. [Raindrop.io アプリの作成](#raindropioアプリの作成)
3. [Anthropic APIキーの取得](#anthropic-apiキーの取得)
4. [環境変数の設定](#環境変数の設定)
5. [Docker Composeでの起動](#docker-composeでの起動)
6. [動作確認](#動作確認)

## 事前準備

### 必要なソフトウェア

- **Docker Desktop**: https://www.docker.com/products/docker-desktop
- **Git**: https://git-scm.com/
- **Node.js 20+** (オプション、ローカル開発用): https://nodejs.org/

### アカウント作成

以下のサービスでアカウントを作成してください:

1. **Raindrop.io**: https://raindrop.io/
   - 記事をブックマークするサービス
   - OAuth認証で使用

2. **Anthropic**: https://console.anthropic.com/
   - Claude APIの利用に必要
   - クレジットカード登録が必要（従量課金）

## Raindrop.io アプリの作成

### 1. Raindrop.ioにログイン

https://raindrop.io/ にアクセスしてログインします。

### 2. 開発者設定にアクセス

https://raindrop.io/app/settings/integrations にアクセスします。

### 3. 新しいアプリを作成

1. 「Create new app」ボタンをクリック
2. 以下の情報を入力:
   - **App name**: `Raindrop AI` (任意の名前)
   - **App description**: `自分語り要約ツール` (任意)
   - **Redirect URI**: `http://localhost:3000/api/auth/callback/raindrop`

3. 「Create」をクリック

### 4. Client IDとClient Secretを取得

作成したアプリの詳細画面で以下の情報をコピーします:

- **Client ID**: `AUTH_RAINDROP_ID`として使用
- **Client Secret**: `AUTH_RAINDROP_SECRET`として使用

⚠️ **重要**: Client Secretは一度しか表示されないので、必ず保存してください。

## Anthropic APIキーの取得

### 1. Anthropic Consoleにログイン

https://console.anthropic.com/ にアクセスしてログインします。

### 2. APIキーを作成

1. 左メニューから「API Keys」を選択
2. 「Create Key」ボタンをクリック
3. キー名を入力（例: `raindary-local`）
4. 「Create Key」をクリック

### 3. APIキーをコピー

表示されたAPIキー（`sk-ant-`で始まる文字列）をコピーします。

⚠️ **重要**: APIキーは一度しか表示されないので、必ず保存してください。

### 4. クレジット残高を確認

- 初回は$5の無料クレジットが付与されます
- 使い切った場合はクレジットカードを登録してチャージしてください

## 環境変数の設定

### 1. .env.localファイルを作成

プロジェクトのルートディレクトリで以下のコマンドを実行:

```bash
cp .env.local.example .env.local
```

### 2. 秘密鍵を生成

以下のコマンドで2つの秘密鍵を生成します:

```bash
# AUTH_SECRET用
openssl rand -hex 32

# ENCRYPTION_KEY用
openssl rand -hex 32
```

### 3. .env.localを編集

`.env.local`ファイルを開いて、以下の値を設定します:

```bash
# Next.js
NEXTAUTH_URL=http://localhost:3000
NODE_ENV=development

# Auth.js（手順2で生成した値）
AUTH_SECRET=<openssl rand -hex 32の出力>

# Raindrop.io OAuth（手順で取得した値）
AUTH_RAINDROP_ID=<Client ID>
AUTH_RAINDROP_SECRET=<Client Secret>

# Database (ローカル開発環境)
DATABASE_URL=postgresql://postgres:postgres@db:5432/raindary

# Inngest (ローカル開発環境)
INNGEST_EVENT_KEY=local_dev_key
INNGEST_SIGNING_KEY=local_signing_key
INNGEST_DEV=1
INNGEST_BASE_URL=http://inngest:8288

# Extract Service
EXTRACT_API_URL=http://extract:8000/extract

# Anthropic Claude（手順で取得した値）
ANTHROPIC_API_KEY=<sk-ant-で始まるAPIキー>

# Token Encryption（手順2で生成した値）
ENCRYPTION_KEY=<openssl rand -hex 32の出力>
```

### 4. 設定確認

すべての必須項目が設定されているか確認:

```bash
# 以下のコマンドで未設定項目がないか確認
grep "=$" .env.local
```

何も表示されなければOKです。

## Docker Composeでの起動

### 1. Dockerデーモンを起動

Docker Desktopを起動します。

### 2. コンテナをビルド・起動

```bash
# 初回起動（ビルドを含む）
docker compose up --build

# ログを確認しながら起動
# Ctrl+Cで停止
```

起動には数分かかります。以下のログが表示されれば成功です:

```
raindary-db-1        | database system is ready to accept connections
raindary-extract-1   | Uvicorn running on http://0.0.0.0:8000
raindary-inngest-1   | Inngest dev server running
raindary-web-1       | ✓ Ready in 3.2s
```

### 3. マイグレーションを実行

別のターミナルで以下を実行:

```bash
docker compose exec web npm run db:migrate
```

成功すると以下のように表示されます:

```
[✓] migrations applied successfully!
```

### 4. バックグラウンドで起動（オプション）

開発中はバックグラウンドで起動しておくと便利です:

```bash
# 停止
docker compose down

# バックグラウンドで起動
docker compose up -d

# ログ確認
docker compose logs -f web
```

## 動作確認

### 1. サービスの起動確認

```bash
docker compose ps
```

すべてのサービスが`Up`状態であることを確認:

```
NAME                    STATUS
raindary-db-1        Up (healthy)
raindary-extract-1   Up (healthy)
raindary-inngest-1   Up
raindary-web-1       Up
```

### 2. Webアプリにアクセス

ブラウザで http://localhost:3000/login にアクセスします。

ログイン画面が表示されればOKです。

### 3. ログインテスト

1. 「Raindrop.ioでログイン」ボタンをクリック
2. Raindrop.ioの認証画面で「Allow」をクリック
3. ダッシュボードにリダイレクトされればOK

### 4. 記事の取り込みテスト

1. ダッシュボードから「記事一覧」に移動
2. 「今すぐ取り込む」ボタンをクリック
3. しばらく待つと、Raindrop.ioの記事が取り込まれます

### 5. Inngest Dev Serverの確認

http://localhost:8288 にアクセスして、実行中のジョブを確認できます。

## トラブルシューティング

### ポート競合エラー

```
Error: port is already allocated
```

他のサービスがポートを使用している場合:

```bash
# 使用中のポートを確認
lsof -i :3000
lsof -i :5432
lsof -i :8000
lsof -i :8288

# プロセスを停止するか、docker-compose.ymlのポート番号を変更
```

### データベース接続エラー

```bash
# データベースを再起動
docker compose restart db

# ログを確認
docker compose logs db
```

### マイグレーションエラー

```bash
# データベースをリセット
docker compose down -v
docker compose up -d db

# マイグレーションを再実行
docker compose exec web npm run db:migrate
```

### Node.js依存関係エラー

```bash
# node_modulesを削除して再インストール
docker compose exec web rm -rf node_modules
docker compose exec web npm install

# webコンテナを再起動
docker compose restart web
```

## 次のステップ

セットアップが完了したら:

1. Raindrop.ioに記事をブックマーク
2. アプリから「今すぐ取り込む」で記事を取り込み
3. 自動生成された要約を確認
4. 異なるトーンで要約を生成してみる

詳しい使い方は [README.md](../README.md) を参照してください。
