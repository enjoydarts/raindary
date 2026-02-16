import { notFound } from "next/navigation"
import { db } from "@/db"
import { summaries, raindrops } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import Image from "next/image"
import Link from "next/link"

const TONE_LABELS: Record<string, { label: string; icon: string }> = {
  neutral: { label: "客観的", icon: "📋" },
  snarky: { label: "毒舌", icon: "😎" },
  enthusiastic: { label: "熱量高め", icon: "🔥" },
  casual: { label: "カジュアル", icon: "💬" },
}

export default async function SharedSummaryPage({
  params,
}: {
  params: { id: string }
}) {
  // 公開された要約を取得
  const [summary] = await db
    .select({
      id: summaries.id,
      summary: summaries.summary,
      tone: summaries.tone,
      rating: summaries.rating,
      ratingReason: summaries.ratingReason,
      model: summaries.model,
      createdAt: summaries.createdAt,
      articleTitle: raindrops.title,
      articleLink: raindrops.link,
      articleCover: raindrops.cover,
      articleExcerpt: raindrops.excerpt,
    })
    .from(summaries)
    .innerJoin(
      raindrops,
      and(eq(summaries.raindropId, raindrops.id), eq(summaries.userId, raindrops.userId))
    )
    .where(and(eq(summaries.id, params.id), eq(summaries.isPublic, 1)))
    .limit(1)

  if (!summary) {
    notFound()
  }

  const toneInfo = TONE_LABELS[summary.tone] || { label: summary.tone, icon: "📝" }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー */}
      <header className="bg-white shadow-sm">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-indigo-600">Raindary</h1>
            <Link
              href="/"
              className="text-sm text-gray-600 hover:text-gray-900"
            >
              自分も使ってみる →
            </Link>
          </div>
        </div>
      </header>

      {/* メインコンテンツ */}
      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <article className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {/* カバー画像 */}
          {summary.articleCover && (
            <div className="relative aspect-[21/9] overflow-hidden bg-gray-100">
              <Image
                src={summary.articleCover}
                alt=""
                fill
                className="object-cover"
              />
            </div>
          )}

          <div className="p-8">
            {/* 記事タイトル */}
            <h1 className="text-3xl font-bold text-gray-900 mb-4">
              {summary.articleTitle}
            </h1>

            {/* メタ情報 */}
            <div className="flex flex-wrap items-center gap-4 mb-6 pb-6 border-b border-gray-200">
              <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-1 text-sm font-semibold text-indigo-700">
                <span>{toneInfo.icon}</span>
                {toneInfo.label}
              </span>
              {summary.rating && (
                <span className="text-yellow-400 text-sm">
                  {"★".repeat(summary.rating)}{"☆".repeat(5 - summary.rating)}
                </span>
              )}
              <span className="text-sm text-gray-500">
                {new Date(summary.createdAt).toLocaleDateString("ja-JP", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>

            {/* 要約 */}
            <div className="prose prose-lg max-w-none">
              <p className="text-gray-800 leading-relaxed whitespace-pre-wrap">
                {summary.summary}
              </p>
            </div>

            {/* 評価理由 */}
            {summary.ratingReason && (
              <div className="mt-6 rounded-lg bg-gray-50 border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-900 mb-2">
                  評価理由
                </h3>
                <p className="text-sm text-gray-700 leading-relaxed">
                  {summary.ratingReason}
                </p>
              </div>
            )}

            {/* 元記事へのリンク */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <a
                href={summary.articleLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-indigo-600 hover:text-indigo-700 font-medium"
              >
                元記事を読む
                <svg
                  className="h-4 w-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </div>

            {/* フッター */}
            <div className="mt-8 pt-6 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                この要約は{" "}
                <Link href="/" className="text-indigo-600 hover:text-indigo-700">
                  Raindary
                </Link>{" "}
                で生成されました（モデル: {summary.model}）
              </p>
            </div>
          </div>
        </article>
      </main>
    </div>
  )
}

export async function generateMetadata({
  params,
}: {
  params: { id: string }
}) {
  const [summary] = await db
    .select({
      articleTitle: raindrops.title,
      summary: summaries.summary,
    })
    .from(summaries)
    .innerJoin(
      raindrops,
      and(eq(summaries.raindropId, raindrops.id), eq(summaries.userId, raindrops.userId))
    )
    .where(and(eq(summaries.id, params.id), eq(summaries.isPublic, 1)))
    .limit(1)

  if (!summary) {
    return {
      title: "要約が見つかりません",
    }
  }

  return {
    title: `${summary.articleTitle} - Raindary要約`,
    description: summary.summary.substring(0, 160),
  }
}
