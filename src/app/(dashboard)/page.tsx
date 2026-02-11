import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { db } from "@/db"
import { summaries, apiUsage } from "@/db/schema"
import { eq, desc, gte, sum, and } from "drizzle-orm"
import Link from "next/link"

export default async function DashboardPage() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get("raindrop-session")

  if (!sessionCookie) {
    redirect("/login")
  }

  let session
  try {
    session = JSON.parse(sessionCookie.value)
  } catch {
    redirect("/login")
  }

  const userId = session.userId

  // 最近の要約を取得（最新5件）
  const recentSummaries = await db
    .select()
    .from(summaries)
    .where(eq(summaries.userId, userId))
    .orderBy(desc(summaries.createdAt))
    .limit(5)

  // 今月のコストを計算
  const startOfMonth = new Date()
  startOfMonth.setDate(1)
  startOfMonth.setHours(0, 0, 0, 0)

  const monthlyCostResult = await db
    .select({ total: sum(apiUsage.costUsd) })
    .from(apiUsage)
    .where(and(eq(apiUsage.userId, userId), gte(apiUsage.createdAt, startOfMonth)))

  const monthlyCost = Number(monthlyCostResult[0]?.total || 0)

  return (
    <div className="px-4 sm:px-0">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">ダッシュボード</h1>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* 今月のコスト */}
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="px-4 py-5 sm:p-6">
            <dt className="truncate text-sm font-medium text-gray-500">今月のコスト</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              ${monthlyCost.toFixed(4)}
            </dd>
          </div>
        </div>

        {/* 要約数 */}
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <div className="px-4 py-5 sm:p-6">
            <dt className="truncate text-sm font-medium text-gray-500">生成済み要約</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">
              {recentSummaries.length}件
            </dd>
          </div>
        </div>
      </div>

      {/* 最近の要約 */}
      <div className="rounded-lg bg-white shadow">
        <div className="px-4 py-5 sm:p-6">
          <h2 className="mb-4 text-lg font-medium text-gray-900">最近の要約</h2>

          {recentSummaries.length === 0 ? (
            <div className="py-12 text-center">
              <p className="mb-4 text-gray-500">まだ要約が生成されていません</p>
              <Link
                href="/dashboard/raindrops"
                className="font-medium text-indigo-600 hover:text-indigo-500"
              >
                記事を取り込む →
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {recentSummaries.map((summary) => (
                <Link
                  key={summary.id}
                  href={`/dashboard/summaries/${summary.id}`}
                  className="block rounded-lg border border-gray-200 p-4 transition-all hover:border-indigo-300 hover:shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="line-clamp-2 text-sm text-gray-900">
                        {summary.summary.substring(0, 100)}...
                      </p>
                      <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                        <span className="capitalize">{summary.tone}</span>
                        {summary.rating && <span>⭐ {summary.rating}/5</span>}
                        <span>
                          {new Date(summary.createdAt).toLocaleDateString("ja-JP")}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
