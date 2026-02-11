# デプロイガイド

このドキュメントでは、Raindrop AIを本番環境にデプロイする手順を説明します。

## アーキテクチャ

- **Next.jsアプリ**: Vercel
- **データベース**: Supabase (PostgreSQL)
- **バックグラウンドジョブ**: Inngest Cloud
- **Extract サービス**: Next.js API Routes（将来的にVercel Serverless Functionsに移行可能）

## 1. Supabase のセットアップ

### 1.1 プロジェクト作成

1. [supabase.com](https://supabase.com) でアカウント作成
2. 「New Project」をクリック
3. プロジェクト情報を入力：
   - Project name: `raindary`
   - Database Password: 強力なパスワードを生成（保存しておく）
   - Region: 最寄りのリージョンを選択（例: Tokyo）

### 1.2 データベース接続情報の取得

1. プロジェクトダッシュボードで「Settings」→「Database」
2. 「Connection string」セクションで以下を取得：
   - URI形式の接続文字列（`postgresql://...`）
   - これを`DATABASE_URL`として使用

### 1.3 データベースマイグレーション

ローカルからSupabaseにマイグレーションを実行：

```bash
# DATABASE_URLを一時的に設定
export DATABASE_URL="postgresql://postgres:[PASSWORD]@[HOST]:[PORT]/postgres"

# マイグレーション実行
npm run db:push
```

または、Supabaseのダッシュボードで「SQL Editor」を開き、`src/db/migrations/0000_striped_champions.sql`の内容を実行。

## 2. Inngest Cloud のセットアップ

### 2.1 アカウント作成

1. [inngest.com](https://www.inngest.com) でアカウント作成
2. 「Create App」をクリック
3. アプリ名を入力（例: `raindary`）

### 2.2 キーの取得

1. ダッシュボードで「Settings」→「Keys」
2. 以下をコピー：
   - **Event Key**: イベント送信用
   - **Signing Key**: Webhook検証用

### 2.3 本番環境設定

環境変数に以下を設定：
- `INNGEST_EVENT_KEY`: Event Key
- `INNGEST_SIGNING_KEY`: Signing Key
- `INNGEST_DEV=0`（本番モード）

## 3. Raindrop.io アプリ設定の更新

1. [Raindrop.io App Management Console](https://app.raindrop.io/settings/integrations)
2. あなたのアプリを開く
3. OAuth redirect URLを本番URLに変更：
   ```
   https://your-app.vercel.app/api/auth/raindrop/callback
   ```

## 4. Vercel デプロイ

### 4.1 GitHubリポジトリの準備

```bash
# Gitリポジトリを初期化（まだの場合）
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### 4.2 Vercelプロジェクト作成

1. [vercel.com](https://vercel.com) でアカウント作成/ログイン
2. 「Import Project」→ GitHubリポジトリを選択
3. プロジェクト設定：
   - Framework Preset: **Next.js**
   - Root Directory: `./`
   - Build Command: `npm run build`（デフォルト）
   - Install Command: `npm install`（デフォルト）

### 4.3 環境変数の設定

Vercelダッシュボードで「Settings」→「Environment Variables」を開き、以下を追加：

#### Next.js / Auth.js
```
NEXTAUTH_URL=https://your-app.vercel.app
NODE_ENV=production
AUTH_SECRET=<openssl rand -hex 32 で生成>
```

#### Raindrop.io OAuth
```
AUTH_RAINDROP_ID=<Raindrop.io Client ID>
AUTH_RAINDROP_SECRET=<Raindrop.io Client Secret>
```

#### Database
```
DATABASE_URL=<Supabaseの接続文字列>
```

#### Inngest
```
INNGEST_EVENT_KEY=<Inngest Event Key>
INNGEST_SIGNING_KEY=<Inngest Signing Key>
INNGEST_DEV=0
INNGEST_BASE_URL=https://inn.gs
```

#### Anthropic Claude
```
ANTHROPIC_API_KEY=<Claude API Key>
```

#### Token Encryption
```
ENCRYPTION_KEY=<openssl rand -hex 32 で生成>
```

### 4.4 デプロイ実行

1. 「Deploy」ボタンをクリック
2. ビルドが完了するまで待つ（数分）
3. デプロイ完了後、URLが表示される

### 4.5 Inngestの接続

1. デプロイ後、Inngest Cloudダッシュボードに戻る
2. 「Apps」→ あなたのアプリを選択
3. 「Sync」をクリックして、Vercelアプリと同期
4. App URLを入力: `https://your-app.vercel.app/api/inngest`
5. 「Save」をクリック

## 5. 動作確認

1. デプロイされたURLにアクセス: `https://your-app.vercel.app`
2. ログインページが表示されることを確認
3. 「Raindrop.ioでログイン」をクリック
4. Raindrop.ioで認証
5. ダッシュボードが表示されることを確認

## 6. トラブルシューティング

### ログの確認

Vercelダッシュボードで「Deployments」→ 最新のデプロイ → 「Logs」

### よくある問題

#### 1. 環境変数が反映されない
- 環境変数を追加/変更した後は、再デプロイが必要
- 「Deployments」→「Redeploy」

#### 2. データベース接続エラー
- `DATABASE_URL`が正しいか確認
- Supabaseのファイアウォール設定を確認（Vercelからの接続を許可）

#### 3. OAuth認証エラー
- Raindrop.ioのRedirect URLが正しいか確認
- `NEXTAUTH_URL`が本番URLと一致しているか確認

#### 4. Inngestイベントが動作しない
- `INNGEST_DEV=0`になっているか確認
- Inngest Cloudでアプリが同期されているか確認

## 7. 継続的デプロイ

`main`ブランチにpushすると、Vercelが自動的にデプロイします：

```bash
git add .
git commit -m "Add new feature"
git push origin main
```

プレビューデプロイ（プルリクエスト用）も自動的に作成されます。

## 8. カスタムドメインの設定（オプション）

1. Vercelダッシュボードで「Settings」→「Domains」
2. カスタムドメインを追加
3. DNSレコードを設定
4. SSL証明書が自動的に発行される

## セキュリティチェックリスト

- [ ] `AUTH_SECRET`は本番用に新しく生成した
- [ ] `ENCRYPTION_KEY`は本番用に新しく生成した
- [ ] Raindrop.io OAuth credentialsは本番用アプリのもの
- [ ] すべての環境変数が正しく設定されている
- [ ] Supabaseのデータベースパスワードは強力
- [ ] `.env.local`はGitにコミットされていない
- [ ] Raindrop.io Redirect URLは本番URLに設定されている

## 参考リンク

- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Inngest Documentation](https://www.inngest.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
