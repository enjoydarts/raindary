import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { withRLS } from "@/db/rls"
import { summaries, raindrops } from "@/db/schema"
import { eq, desc, and, isNull } from "drizzle-orm"
import Link from "next/link"
import { FileText, ArrowRight } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { RefreshButton } from "@/components/RefreshButton"
import { SearchableList } from "./searchable-list"

export default async function SummariesPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/login")
  }

  const userId = session.user.id

  // RLS対応: 生成済み要約を取得（記事情報と結合）
  const items = await withRLS(userId, async (tx) => {
    return await tx
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
      .where(isNull(summaries.deletedAt))
      .orderBy(desc(summaries.updatedAt))
      .limit(100)
  })

  return (
    <div className="px-4 sm:px-0">
      <div className="mb-8 sm:flex items-center sm:justify-between border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">要約一覧</h1>
          <p className="mt-2 text-sm text-slate-600">{items.length}件の要約</p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-4">
          <RefreshButton />
        </div>
      </div>

      {items.length === 0 ? (
        <Card>
          <div className="px-4 py-16 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <FileText className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-2">まだ要約が生成されていません</h3>
            <p className="text-sm text-slate-500 mb-4">記事を取り込んで、要約を生成してみましょう</p>
            <Button asChild className="bg-indigo-600 hover:bg-indigo-700">
              <Link href="/raindrops">
                記事を取り込む
                <ArrowRight className="h-4 w-4 ml-2" />
              </Link>
            </Button>
          </div>
        </Card>
      ) : (
        <SearchableList items={items} />
      )}
    </div>
  )
}
