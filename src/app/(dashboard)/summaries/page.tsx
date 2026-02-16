import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/db"
import { summaries, raindrops } from "@/db/schema"
import { eq, desc, and } from "drizzle-orm"
import Link from "next/link"
import { SearchableList } from "./searchable-list"

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
      isPublic: summaries.isPublic,
      createdAt: summaries.createdAt,
      raindropId: summaries.raindropId,
      // 記事情報
      articleTitle: raindrops.title,
      articleCover: raindrops.cover,
      articleLink: raindrops.link,
      articleExcerpt: raindrops.excerpt,
    })
    .from(summaries)
    .innerJoin(
      raindrops,
      and(eq(summaries.raindropId, raindrops.id), eq(summaries.userId, raindrops.userId))
    )
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
        <SearchableList items={items} />
      )}
    </div>
  )
}
