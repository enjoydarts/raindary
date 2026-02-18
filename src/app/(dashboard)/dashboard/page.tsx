import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { withRLS } from "@/db/rls"
import { raindrops, summaries, apiUsage } from "@/db/schema"
import { count, sum, isNull, and, gte, sql } from "drizzle-orm"
import Link from "next/link"
import { Newspaper, FileText, DollarSign, ChevronRight, ArrowRight, ClipboardList, Zap, Flame, MessageCircle, Check, X, Loader2, Clock } from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { maskSession } from "@/lib/logger"

const TONE_LABELS = {
  neutral: { label: "客観的", Icon: ClipboardList },
  snarky: { label: "毒舌", Icon: Zap },
  enthusiastic: { label: "熱量高め", Icon: Flame },
  casual: { label: "カジュアル", Icon: MessageCircle },
} as const

const STATUS_LABELS = {
  completed: { label: "完了", Icon: Check, className: "bg-green-100 text-green-800 hover:bg-green-100" },
  failed: { label: "失敗", Icon: X, className: "bg-red-100 text-red-800 hover:bg-red-100" },
  processing: { label: "処理中", Icon: Loader2, className: "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" },
  pending: { label: "待機中", Icon: Clock, className: "bg-slate-100 text-slate-800 hover:bg-slate-100" },
} as const

export default async function DashboardPage() {
  const session = await auth()

  console.log("[dashboard] Session from auth():", JSON.stringify(maskSession(session), null, 2))

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
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          ようこそ、{user.name}さん
        </h1>
        <p className="mt-3 text-base text-slate-600">
          Raindrop.ioから記事を取り込んで、AI要約を生成しましょう
        </p>
      </div>

      {/* 統計カード */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {/* 記事数 */}
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <dt className="text-sm font-medium text-slate-500 mb-2">保存済み記事</dt>
                <dd className="text-4xl font-bold text-slate-900">{raindropCount.count}</dd>
              </div>
              <div className="flex-shrink-0 rounded-lg bg-slate-100 p-3">
                <Newspaper className="h-7 w-7 text-indigo-600" />
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t border-slate-100 bg-slate-50/50 px-6 py-3">
            <Link href="/raindrops" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group">
              記事一覧を見る
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </CardFooter>
        </Card>

        {/* 要約数 */}
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <dt className="text-sm font-medium text-slate-500 mb-2">生成済み要約</dt>
                <dd className="text-4xl font-bold text-slate-900">{summaryCount.count}</dd>
              </div>
              <div className="flex-shrink-0 rounded-lg bg-slate-100 p-3">
                <FileText className="h-7 w-7 text-indigo-600" />
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t border-slate-100 bg-slate-50/50 px-6 py-3">
            <Link href="/summaries" className="text-sm font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 group">
              要約一覧を見る
              <ChevronRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </CardFooter>
        </Card>

        {/* 今月のコスト */}
        <Card className="card-hover">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <dt className="text-sm font-medium text-slate-500 mb-2">今月のAPI利用</dt>
                <dd className="text-4xl font-bold text-slate-900" suppressHydrationWarning>
                  ${totalCost.toFixed(4)}
                </dd>
              </div>
              <div className="flex-shrink-0 rounded-lg bg-slate-100 p-3">
                <DollarSign className="h-7 w-7 text-indigo-600" />
              </div>
            </div>
          </CardContent>
          <CardFooter className="border-t border-slate-100 bg-slate-50/50 px-6 py-3">
            <span className="text-sm text-slate-600">
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
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-xl font-semibold text-slate-900">最近の要約</h2>
            <Link href="/summaries" className="text-sm font-medium text-indigo-600 hover:text-indigo-500">
              すべて見る →
            </Link>
          </div>
          <div className="grid gap-4">
            {recentSummaries.map((summary) => {
              const toneInfo = TONE_LABELS[summary.tone as keyof typeof TONE_LABELS] || {
                label: summary.tone,
                Icon: FileText
              }
              const ToneIcon = toneInfo.Icon

              return (
                <Link key={summary.id} href={`/summaries/${summary.id}`}>
                  <Card className="card-hover">
                    <CardContent className="p-6">
                      <div className="space-y-4">
                        {/* ヘッダー: タイトルとステータス */}
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="flex-1 text-base font-semibold text-slate-900 line-clamp-2">
                            {summary.articleTitle || '無題の記事'}
                          </h3>
                          {(() => {
                            const statusInfo = STATUS_LABELS[summary.status as keyof typeof STATUS_LABELS] || STATUS_LABELS.pending
                            const StatusIcon = statusInfo.Icon
                            return (
                              <Badge
                                variant={summary.status === 'failed' ? 'destructive' : 'secondary'}
                                className={statusInfo.className}
                              >
                                <StatusIcon className={`h-3 w-3 mr-1 ${summary.status === 'processing' ? 'animate-spin' : ''}`} />
                                {statusInfo.label}
                              </Badge>
                            )
                          })()}
                        </div>

                        {/* 要約プレビュー */}
                        {summary.status === 'completed' && summary.summary && (
                          <p className="text-sm text-slate-600 line-clamp-2">
                            {summary.summary.substring(0, 150)}...
                          </p>
                        )}

                        {/* メタ情報 */}
                        <div className="flex items-center gap-3 text-xs text-slate-500">
                          <Badge variant="secondary" className="bg-indigo-50 text-indigo-700 hover:bg-indigo-50">
                            <ToneIcon className="h-3 w-3 mr-1" />
                            {toneInfo.label}
                          </Badge>
                          <span suppressHydrationWarning>
                            {new Date(summary.createdAt).toLocaleDateString('ja-JP', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                              timeZone: 'Asia/Tokyo'
                            })}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
