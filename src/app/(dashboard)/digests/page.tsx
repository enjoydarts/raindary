import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { withRLS } from "@/db/rls"
import { digests } from "@/db/schema"
import { eq, desc } from "drizzle-orm"
import { BookOpen, Calendar, Tag } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { TriggerDigestButton } from "./trigger-digest-button"
import { DigestMarkdown } from "./digest-markdown"

export default async function DigestsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/login")
  }

  const userId = session.user.id

  const items = await withRLS(userId, async (tx) => {
    return await tx
      .select()
      .from(digests)
      .where(eq(digests.userId, userId))
      .orderBy(desc(digests.createdAt))
      .limit(52) // 最大1年分
  })

  const PERIOD_LABELS: Record<string, string> = {
    weekly: "週次",
    monthly: "月次",
  }

  return (
    <div className="px-4 sm:px-0">
      <div className="mb-8 border-b border-slate-200 dark:border-slate-700 pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              ダイジェスト
            </h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              週次・月次の読書トレンドをAIが自動分析します。毎週月曜日に先週分が生成されます。
            </p>
          </div>
          <TriggerDigestButton />
        </div>
      </div>

      {items.length === 0 ? (
        <Card>
          <div className="px-4 py-16 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
              <BookOpen className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100 mb-2">
              まだダイジェストがありません
            </h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              週次ダイジェストは毎週月曜日に自動生成されます。要約を蓄積してしばらくお待ちください。
            </p>
          </div>
        </Card>
      ) : (
        <div className="space-y-6">
          {items.map((digest) => {
            const periodLabel = PERIOD_LABELS[digest.period] || digest.period
            const topThemes = Array.isArray(digest.topThemes)
              ? (digest.topThemes as string[])
              : []

            return (
              <Card key={digest.id} className="overflow-hidden">
                <CardHeader className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700 px-6 py-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <Badge className="bg-indigo-600 hover:bg-indigo-600">
                      {periodLabel}
                    </Badge>
                    <span className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400">
                      <Calendar className="h-4 w-4" />
                      {new Date(digest.periodStart).toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        timeZone: "Asia/Tokyo",
                      })}
                      {" 〜 "}
                      {new Date(digest.periodEnd).toLocaleDateString("ja-JP", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        timeZone: "Asia/Tokyo",
                      })}
                    </span>
                    <span className="text-xs text-slate-500">
                      {digest.summaryCount}件の要約から生成
                    </span>
                  </div>
                  {topThemes.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5 items-center">
                      <Tag className="h-3.5 w-3.5 text-slate-400" />
                      {topThemes.map((theme) => (
                        <Badge
                          key={theme}
                          variant="outline"
                          className="text-xs bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200"
                        >
                          {theme}
                        </Badge>
                      ))}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="px-6 py-5">
                  <DigestMarkdown content={digest.content} />
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
