import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/db"
import { summaries, raindrops } from "@/db/schema"
import { eq, desc } from "drizzle-orm"
import Link from "next/link"
import Image from "next/image"

const TONE_LABELS: Record<string, { label: string; icon: string }> = {
  neutral: { label: "客観的", icon: "📋" },
  snarky: { label: "毒舌", icon: "😎" },
  enthusiastic: { label: "熱量高め", icon: "🔥" },
  casual: { label: "カジュアル", icon: "💬" },
}

export default async function SummariesPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/login")
  }

  const userId = session.user.id

  // 生成済み要約を取得（記事情報と結合）
  const items = await db
    .select({
      id: summaries.id,
      summary: summaries.summary,
      tone: summaries.tone,
      status: summaries.status,
      rating: summaries.rating,
      ratingReason: summaries.ratingReason,
      error: summaries.error,
      createdAt: summaries.createdAt,
      raindropId: summaries.raindropId,
      // 記事情報
      articleTitle: raindrops.title,
      articleCover: raindrops.cover,
      articleLink: raindrops.link,
      articleExcerpt: raindrops.excerpt,
    })
    .from(summaries)
    .innerJoin(raindrops, eq(summaries.raindropId, raindrops.id))
    .where(eq(summaries.userId, userId))
    .orderBy(desc(summaries.createdAt))
    .limit(100)

  return (
    <div className="px-4 sm:px-0">
      <div className="mb-8 border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">要約一覧</h1>
        <p className="mt-2 text-sm text-gray-600">{items.length}件の要約</p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="px-4 py-16 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-2">まだ要約が生成されていません</h3>
            <p className="text-sm text-gray-500 mb-4">記事を取り込んで、要約を生成してみましょう</p>
            <Link
              href="/raindrops"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
            >
              記事を取り込む
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/summaries/${item.id}`}
              className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md hover:border-gray-300"
            >
              {/* カバー画像 */}
              {item.articleCover ? (
                <div className="relative aspect-[16/9] overflow-hidden bg-gray-100">
                  <Image
                    src={item.articleCover}
                    alt=""
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                  {/* バッジ（画像の上） */}
                  <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
                    {/* トーンバッジ */}
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-600/90 backdrop-blur-sm px-2.5 py-1 text-xs font-semibold text-white">
                      <span>{TONE_LABELS[item.tone]?.icon || "📝"}</span>
                      {TONE_LABELS[item.tone]?.label || item.tone}
                    </span>

                    {/* ステータスバッジ */}
                    <div>
                    {item.status === "completed" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-600/90 backdrop-blur-sm px-2.5 py-1 text-xs font-semibold text-white">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        完了
                      </span>
                    )}
                    {item.status === "failed" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-600/90 backdrop-blur-sm px-2.5 py-1 text-xs font-semibold text-white">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        失敗
                      </span>
                    )}
                    {item.status === "processing" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-600/90 backdrop-blur-sm px-2.5 py-1 text-xs font-semibold text-white">
                        <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                        処理中
                      </span>
                    )}
                  </div>
                  </div>
                </div>
              ) : (
                <div className="relative aspect-[16/9] bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                  <svg className="h-12 w-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                  {/* バッジ */}
                  <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
                    {/* トーンバッジ */}
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white">
                      <span>{TONE_LABELS[item.tone]?.icon || "📝"}</span>
                      {TONE_LABELS[item.tone]?.label || item.tone}
                    </span>

                    {/* ステータスバッジ */}
                    <div>
                    {item.status === "completed" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-green-600 px-2.5 py-1 text-xs font-semibold text-white">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        完了
                      </span>
                    )}
                    {item.status === "failed" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-xs font-semibold text-white">
                        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        失敗
                      </span>
                    )}
                    {item.status === "processing" && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-600 px-2.5 py-1 text-xs font-semibold text-white">
                        <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                        </svg>
                        処理中
                      </span>
                    )}
                  </div>
                  </div>
                </div>
              )}

              {/* コンテンツ */}
              <div className="p-5">
                {/* 記事タイトル */}
                <h3 className="text-base font-bold text-gray-900 line-clamp-2 mb-2 group-hover:text-indigo-600 transition-colors">
                  {item.articleTitle}
                </h3>

                {/* 要約プレビュー */}
                {item.status === "completed" && item.summary && (
                  <p className="text-sm text-gray-600 line-clamp-3 mb-3 leading-relaxed">
                    {item.summary}
                  </p>
                )}

                {/* エラーメッセージ */}
                {item.status === "failed" && item.error && (
                  <div className="mb-3 rounded-lg bg-red-50 border border-red-200 p-3">
                    <p className="text-xs font-semibold text-red-900 mb-1">エラーが発生しました</p>
                    <p className="text-xs text-red-700 line-clamp-2">{item.error}</p>
                  </div>
                )}

                {/* メタ情報 */}
                <div className="flex items-center justify-between text-xs text-gray-500 pt-3 border-t border-gray-100">
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center gap-1 capitalize px-2 py-1 rounded-full bg-indigo-50 text-indigo-700 font-medium">
                      {item.tone}
                    </span>
                    {item.rating && (
                      <span className="inline-flex items-center gap-1">
                        <svg className="h-3.5 w-3.5 text-yellow-400 fill-current" viewBox="0 0 24 24">
                          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                        {item.rating}/5
                      </span>
                    )}
                  </div>
                  <span className="flex items-center gap-1">
                    <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {new Date(item.createdAt).toLocaleDateString("ja-JP", {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
