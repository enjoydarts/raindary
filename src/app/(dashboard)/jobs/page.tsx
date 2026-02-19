import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { withRLS } from "@/db/rls"
import { summaries, raindrops } from "@/db/schema"
import { and, desc, eq, isNull } from "drizzle-orm"
import { Card } from "@/components/ui/card"
import { Briefcase } from "lucide-react"
import { JobList } from "./job-list"
import { RefreshButton } from "@/components/RefreshButton"

export default async function JobsPage() {
  const session = await auth()
  if (!session?.user?.id) {
    redirect("/login")
  }

  const userId = session.user.id

  const jobs = await withRLS(userId, async (tx) => {
    return await tx
      .select({
        id: summaries.id,
        raindropId: summaries.raindropId,
        tone: summaries.tone,
        status: summaries.status,
        error: summaries.error,
        updatedAt: summaries.updatedAt,
        title: raindrops.title,
      })
      .from(summaries)
      .innerJoin(
        raindrops,
        and(eq(summaries.userId, raindrops.userId), eq(summaries.raindropId, raindrops.id))
      )
      .where(isNull(summaries.deletedAt))
      .orderBy(desc(summaries.updatedAt))
      .limit(500)
  })

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-2 text-3xl font-bold tracking-tight text-slate-900">
              <Briefcase className="h-7 w-7 text-indigo-600" />
              ジョブ管理
            </h1>
            <p className="mt-2 text-sm text-slate-600">
              要約ジョブの状態確認・失敗ジョブの再実行ができます
            </p>
          </div>
          <RefreshButton />
        </div>
      </div>

      {jobs.length === 0 ? (
        <Card>
          <div className="px-4 py-16 text-center">
            <p className="text-sm text-slate-500">ジョブがまだありません</p>
          </div>
        </Card>
      ) : (
        <JobList jobs={jobs} />
      )}
    </div>
  )
}
