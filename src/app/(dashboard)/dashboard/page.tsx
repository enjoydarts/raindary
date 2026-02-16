import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { withRLS } from "@/db/rls"
import { raindrops, summaries, apiUsage } from "@/db/schema"
import { count, sum, isNull, and, gte, sql } from "drizzle-orm"
import Link from "next/link"
import { Newspaper, FileText, DollarSign, ChevronRight, ArrowRight } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default async function DashboardPage() {
  const session = await auth()

  console.log("[dashboard] Session from auth():", JSON.stringify(session, null, 2))

  // ミドルウェアで既に認証済みなので、ここでは必ず session.user が存在する
  const user = session!.user
  const userId = user.id!

  // RLS対応: 統計情報を取得
  const { raindropCount, summaryCount, monthlyCost, recentSummaries } = await withRLS(
    userId,
    async (tx) => {
      // 統計情報を取得（RLSで自動的にユーザーのデータのみ取得）
      const [raindropCount] = await tx
        .select({ count: count() })
        .from(raindrops)
        .where(isNull(raindrops.deletedAt))

      const [summaryCount] = await tx.select({ count: count() }).from(summaries)

      // 今月のAPI使用量
      const now = new Date()
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

      const [monthlyCost] = await tx
        .select({ total: sum(apiUsage.costUsd) })
        .from(apiUsage)
        .where(gte(apiUsage.createdAt, firstDayOfMonth))

      // 最近の要約を取得（記事情報も含む）
      const recentSummaries = await tx
        .select({
          id: summaries.id,
          raindropId: summaries.raindropId,
          tone: summaries.tone,
          status: summaries.status,
          createdAt: summaries.createdAt,
          summary: summaries.summary,
          articleTitle: raindrops.title,
        })
        .from(summaries)
        .leftJoin(raindrops, sql`${summaries.raindropId} = ${raindrops.id}`)
        .orderBy(sql`${summaries.createdAt} DESC`)
        .limit(3)

      return { raindropCount, summaryCount, monthlyCost, recentSummaries }
    }
  )

  const totalCost = Number(monthlyCost?.total || 0)

  return (
    <div className="space-y-8">
      {/* ウェルカムセクション */}
      <div className="border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          ようこそ、{user.name}さん
        </h1>
        <p className="mt-3 text-base text-gray-600">
          Raindrop.ioから記事を取り込んで、AI要約を生成しましょう
        </p>
      </div>

      {/* 統計カード */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* 記事数 */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <dt className="text-sm font-medium text-gray-500 mb-2">保存済み記事</dt>
                <dd className="text-4xl font-bold text-gray-900">{raindropCount.count}</dd>
              </div>
              <div className="flex-shrink-0 rounded-lg bg-indigo-50 p-3">
                <Newspaper className="h-7 w-7 text-indigo-600" />
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t border-gray-100 bg-gray-50/50 px-6 py-3">
            <Link href="/raindrops" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group">
              記事一覧を見る
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </CardFooter>
        </Card>

        {/* 要約数 */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <dt className="text-sm font-medium text-gray-500 mb-2">生成済み要約</dt>
                <dd className="text-4xl font-bold text-gray-900">{summaryCount.count}</dd>
              </div>
              <div className="flex-shrink-0 rounded-lg bg-green-50 p-3">
                <FileText className="h-7 w-7 text-green-600" />
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t border-gray-100 bg-gray-50/50 px-6 py-3">
            <Link href="/summaries" className="text-sm font-semibold text-green-600 hover:text-green-700 flex items-center gap-1 group">
              要約一覧を見る
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </CardFooter>
        </Card>

        {/* 今月のコスト */}
        <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <dt className="text-sm font-medium text-gray-500 mb-2">今月のAPI利用</dt>
                <dd className="text-4xl font-bold text-gray-900" suppressHydrationWarning>
                  ${totalCost.toFixed(4)}
                </dd>
              </div>
              <div className="flex-shrink-0 rounded-lg bg-purple-50 p-3">
                <DollarSign className="h-7 w-7 text-purple-600" />
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t border-gray-100 bg-gray-50/50 px-6 py-3">
            <span className="text-sm text-gray-600">
              {new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long' })}
            </span>
          </CardFooter>
        </Card>
      </div>

      {/* クイックアクション */}
      <Card className="border-2 border-indigo-200 bg-indigo-50 shadow-sm">
        <CardContent className="p-8">
          <div className="sm:flex sm:items-center sm:justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-indigo-900">記事を取り込む</h2>
              <p className="mt-2 text-base text-indigo-700">
                Raindrop.ioから最新の記事を同期して、AI要約を生成しましょう
              </p>
            </div>
            <div className="mt-6 sm:mt-0 sm:ml-6 flex-shrink-0">
              <Button asChild size="lg" className="bg-indigo-600 hover:bg-indigo-700">
                <Link href="/raindrops">
                  記事を同期
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Link>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 最近の要約 */}
      {recentSummaries.length > 0 && (
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">最近の要約</h2>
            <Link href="/summaries" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
              すべて見る →
            </Link>
          </div>
          <div className="space-y-4">
            {recentSummaries.map((summary) => (
              <Link key={summary.id} href={`/summaries/${summary.id}`}>
                <Card className="transition-all hover:shadow-md hover:border-indigo-200">
                  <CardContent className="p-5">
                    <div className="space-y-3">
                      {/* ヘッダー: タイトルとステータス */}
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="flex-1 text-base font-semibold text-gray-900 line-clamp-2">
                          {summary.articleTitle || '無題の記事'}
                        </h3>
                        <Badge
                          variant={
                            summary.status === 'completed'
                              ? 'default'
                              : summary.status === 'failed'
                              ? 'destructive'
                              : 'secondary'
                          }
                          className={
                            summary.status === 'completed'
                              ? 'bg-green-100 text-green-800 hover:bg-green-100'
                              : summary.status === 'processing'
                              ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-100'
                              : ''
                          }
                        >
                          {summary.status}
                        </Badge>
                      </div>

                      {/* 要約プレビュー */}
                      {summary.status === 'completed' && summary.summary && (
                        <p className="text-sm text-gray-600 line-clamp-2">
                          {summary.summary.substring(0, 150)}...
                        </p>
                      )}

                      {/* メタ情報 */}
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50 capitalize">
                          {summary.tone}
                        </Badge>
                        <span suppressHydrationWarning>
                          {new Date(summary.createdAt).toLocaleDateString('ja-JP', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric'
                          })}
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
