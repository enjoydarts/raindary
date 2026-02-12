import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/db"
import { summaries, raindrops, apiUsage } from "@/db/schema"
import { eq, and, sum } from "drizzle-orm"
import { notFound } from "next/navigation"
import Link from "next/link"

export default async function SummaryDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/login")
  }

  const userId = session.user.id

  // 要約を取得
  const [summary] = await db
    .select()
    .from(summaries)
    .where(and(eq(summaries.id, id), eq(summaries.userId, userId)))
    .limit(1)

  if (!summary) {
    notFound()
  }

  // 元記事を取得
  const [raindrop] = await db
    .select()
    .from(raindrops)
    .where(and(eq(raindrops.userId, userId), eq(raindrops.id, summary.raindropId)))
    .limit(1)

  // この要約のコストを計算
  const costResult = await db
    .select({ total: sum(apiUsage.costUsd) })
    .from(apiUsage)
    .where(eq(apiUsage.summaryId, summary.id))

  const cost = Number(costResult[0]?.total || 0)

  return (
    <div className="mx-auto max-w-4xl px-4 sm:px-0">
      <div className="mb-4">
        <Link
          href="/dashboard/summaries"
          className="text-sm text-indigo-600 hover:text-indigo-500"
        >
          ← 要約一覧に戻る
        </Link>
      </div>

      <div className="overflow-hidden rounded-lg bg-white shadow">
        {/* ヘッダー */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="mb-2 text-2xl font-bold text-gray-900">
                {raindrop?.title || "記事タイトル"}
              </h1>
              {raindrop?.link && (
                <a
                  href={raindrop.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-indigo-600 hover:text-indigo-500"
                >
                  元記事を見る →
                </a>
              )}
            </div>
          </div>
        </div>

        {/* メタ情報 */}
        <div className="border-b border-gray-200 bg-gray-50 px-6 py-4">
          <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <dt className="text-gray-500">トーン</dt>
              <dd className="mt-1 font-medium capitalize text-gray-900" suppressHydrationWarning>
                {String(summary.tone)}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">評価</dt>
              <dd className="mt-1 font-medium text-gray-900" suppressHydrationWarning>
                {summary.rating ? `⭐ ${String(summary.rating)}/5` : "-"}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">コスト</dt>
              <dd className="mt-1 font-medium text-gray-900" suppressHydrationWarning>
                ${cost.toFixed(6)}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">生成日時</dt>
              <dd className="mt-1 font-medium text-gray-900" suppressHydrationWarning>
                {new Date(summary.createdAt).toLocaleDateString("ja-JP")}
              </dd>
            </div>
          </div>
        </div>

        {/* 要約本文 */}
        <div className="px-6 py-6">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">要約</h2>
          <div className="prose prose-sm max-w-none">
            <p className="whitespace-pre-wrap text-gray-700" suppressHydrationWarning>
              {String(summary.summary)}
            </p>
          </div>

          {summary.ratingReason && (
            <div className="mt-6 rounded-lg bg-gray-50 p-4">
              <h3 className="mb-2 text-sm font-semibold text-gray-900">評価理由</h3>
              <p className="text-sm text-gray-700">{String(summary.ratingReason)}</p>
            </div>
          )}
        </div>

        {/* 抽出された事実（デバッグ用） */}
        {summary.factsJson ? (
          <div className="border-t border-gray-200 px-6 py-4">
            <details className="text-sm">
              <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                抽出された事実を見る
              </summary>
              <pre className="mt-2 overflow-x-auto rounded bg-gray-50 p-4" suppressHydrationWarning>
                {JSON.stringify(summary.factsJson, null, 2)}
              </pre>
            </details>
          </div>
        ) : null}
      </div>
    </div>
  )
}
