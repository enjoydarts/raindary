import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/db"
import { raindrops, summaries, apiUsage } from "@/db/schema"
import { eq, and, sql, desc, gte, isNull } from "drizzle-orm"

export default async function StatsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/login")
  }

  const userId = session.user.id

  // 今月の開始日
  const thisMonthStart = new Date()
  thisMonthStart.setDate(1)
  thisMonthStart.setHours(0, 0, 0, 0)

  // 1. 基本統計
  const [stats] = await db
    .select({
      totalRaindrops: sql<number>`count(distinct ${raindrops.id})`.mapWith(Number),
      totalSummaries: sql<number>`count(distinct ${summaries.id})`.mapWith(Number),
    })
    .from(raindrops)
    .leftJoin(summaries, eq(raindrops.id, summaries.raindropId))
    .where(
      and(
        eq(raindrops.userId, userId),
        isNull(raindrops.deletedAt)
      )
    )

  // 2. 今月のAPI使用量とコスト
  const monthlyUsage = await db
    .select({
      totalCost: sql<string>`COALESCE(SUM(${apiUsage.costUsd}), 0)`,
      totalInputTokens: sql<number>`COALESCE(SUM(${apiUsage.inputTokens}), 0)`.mapWith(Number),
      totalOutputTokens: sql<number>`COALESCE(SUM(${apiUsage.outputTokens}), 0)`.mapWith(Number),
    })
    .from(apiUsage)
    .where(
      and(
        eq(apiUsage.userId, userId),
        gte(apiUsage.createdAt, thisMonthStart)
      )
    )

  // 3. トーン別要約数
  const summariesByTone = await db
    .select({
      tone: summaries.tone,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(summaries)
    .where(
      and(
        eq(summaries.userId, userId),
        eq(summaries.status, "completed"),
        isNull(summaries.deletedAt)
      )
    )
    .groupBy(summaries.tone)

  // 4. 評価の分布
  const ratingDistribution = await db
    .select({
      rating: summaries.rating,
      count: sql<number>`count(*)`.mapWith(Number),
    })
    .from(summaries)
    .where(
      and(
        eq(summaries.userId, userId),
        eq(summaries.status, "completed"),
        sql`${summaries.rating} IS NOT NULL`,
        isNull(summaries.deletedAt)
      )
    )
    .groupBy(summaries.rating)
    .orderBy(summaries.rating)

  // 5. 最近の要約（5件）
  const recentSummaries = await db
    .select({
      id: summaries.id,
      tone: summaries.tone,
      status: summaries.status,
      rating: summaries.rating,
      createdAt: summaries.createdAt,
      articleTitle: raindrops.title,
    })
    .from(summaries)
    .innerJoin(
      raindrops,
      and(eq(summaries.raindropId, raindrops.id), eq(summaries.userId, raindrops.userId))
    )
    .where(
      and(
        eq(summaries.userId, userId),
        isNull(summaries.deletedAt)
      )
    )
    .orderBy(desc(summaries.createdAt))
    .limit(5)

  const totalCost = parseFloat(monthlyUsage[0]?.totalCost || "0")
  const totalInputTokens = monthlyUsage[0]?.totalInputTokens || 0
  const totalOutputTokens = monthlyUsage[0]?.totalOutputTokens || 0

  return (
    <div className="px-4 sm:px-0">
      <div className="mb-8 border-b border-gray-200 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">統計</h1>
        <p className="mt-2 text-sm text-gray-600">記事と要約の統計情報</p>
      </div>

      {/* 基本統計カード */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-3">
              <svg className="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">総記事数</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalRaindrops}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-3">
              <svg className="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">総要約数</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSummaries}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-purple-100 p-3">
              <svg className="h-6 w-6 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">今月のコスト</p>
              <p className="text-2xl font-bold text-gray-900">${totalCost.toFixed(2)}</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-orange-100 p-3">
              <svg className="h-6 w-6 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-600">今月のトークン</p>
              <p className="text-2xl font-bold text-gray-900">
                {((totalInputTokens + totalOutputTokens) / 1000).toFixed(1)}K
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* トーン別要約数 & 評価分布 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 mb-8">
        {/* トーン別要約数 */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">トーン別要約数</h2>
          <div className="space-y-3">
            {summariesByTone.map((item) => {
              const toneLabels: Record<string, { label: string; icon: string; color: string }> = {
                neutral: { label: "客観的", icon: "📋", color: "bg-gray-100 text-gray-700" },
                snarky: { label: "毒舌", icon: "😎", color: "bg-purple-100 text-purple-700" },
                enthusiastic: { label: "熱量高め", icon: "🔥", color: "bg-red-100 text-red-700" },
                casual: { label: "カジュアル", icon: "💬", color: "bg-blue-100 text-blue-700" },
              }
              const toneInfo = toneLabels[item.tone] || { label: item.tone, icon: "📝", color: "bg-gray-100 text-gray-700" }
              const percentage = stats.totalSummaries > 0 ? (item.count / stats.totalSummaries) * 100 : 0

              return (
                <div key={item.tone} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-semibold ${toneInfo.color}`}>
                      <span>{toneInfo.icon}</span>
                      {toneInfo.label}
                    </span>
                    <span className="text-sm text-gray-600">{item.count}件</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-indigo-600 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-12 text-right">
                      {percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 評価分布 */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-gray-900 mb-4">評価分布</h2>
          <div className="space-y-3">
            {[5, 4, 3, 2, 1].map((rating) => {
              const data = ratingDistribution.find((r) => r.rating === rating)
              const count = data?.count || 0
              const total = ratingDistribution.reduce((sum, r) => sum + r.count, 0)
              const percentage = total > 0 ? (count / total) * 100 : 0

              return (
                <div key={rating} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-yellow-400 text-sm">{"★".repeat(rating)}{"☆".repeat(5 - rating)}</span>
                    <span className="text-sm text-gray-600">{count}件</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-12 text-right">
                      {percentage.toFixed(0)}%
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* 最近の要約 */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-200 px-6 py-4">
          <h2 className="text-lg font-bold text-gray-900">最近の要約</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {recentSummaries.map((item) => {
            const toneLabels: Record<string, { label: string; icon: string }> = {
              neutral: { label: "客観的", icon: "📋" },
              snarky: { label: "毒舌", icon: "😎" },
              enthusiastic: { label: "熱量高め", icon: "🔥" },
              casual: { label: "カジュアル", icon: "💬" },
            }
            const toneInfo = toneLabels[item.tone] || { label: item.tone, icon: "📝" }

            return (
              <div key={item.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 line-clamp-1">
                      {item.articleTitle}
                    </h3>
                    <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                      <span className="inline-flex items-center gap-1">
                        <span>{toneInfo.icon}</span>
                        {toneInfo.label}
                      </span>
                      {item.status === "completed" && (
                        <span className="inline-flex items-center gap-1 text-green-600">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          完了
                        </span>
                      )}
                      {item.rating && (
                        <span className="text-yellow-400">
                          {"★".repeat(item.rating)}
                        </span>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">
                    {new Date(item.createdAt).toLocaleDateString("ja-JP")}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
