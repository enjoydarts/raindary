# Raindrop AI - 自分語り要約

Raindrop.ioに保存した記事を自動で取り込み、AI要約で「読んだフリができる自分語り要約」を生成するツール

## 概要

技術記事を大量に保存するが読み切れないエンジニアのための、Claude APIを使った自動要約システム。
複数のトーン（毒舌、客観的、熱量高め、カジュアル）で要約を生成し、コストも可視化します。

## 技術スタック

- **Frontend**: Next.js 15 (App Router) + TypeScript
- **UI**: shadcn/ui + Tailwind CSS
- **Auth**: Auth.js v5 (Raindrop OAuth2)
- **Database**: Supabase PostgreSQL
- **ORM**: Drizzle ORM
- **Queue**: Inngest
- **Extract**: Python + trafilatura
- **LLM**: Anthropic Claude
- **Deploy**: Vercel

## 主な機能

- ✅ Raindrop.io OAuth認証
- ✅ 記事の自動取り込み
- ✅ 本文抽出（trafilatura）
- ✅ 2段階AI要約（事実抽出 → 自分語り要約）
- ✅ 4種類のトーン対応
- ✅ マルチユーザー対応
- ✅ コスト追跡・可視化
- ✅ 手動・自動同期

## セットアップ

詳細なセットアップ手順は [docs/SETUP.md](docs/SETUP.md) を参照してください。

## 開発

```bash
# ローカル開発環境起動（Docker Compose）
docker compose up --build

# Next.js開発サーバー
npm run dev
```

## ライセンス

MIT

## 作成者

@enjoydarts
