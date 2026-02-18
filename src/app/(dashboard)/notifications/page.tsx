import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { withRLS } from "@/db/rls"
import { notifications } from "@/db/schema"
import { desc, isNull } from "drizzle-orm"
import { Bell } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { DeleteAllButton } from "./delete-all-button"
import { NotificationList } from "./notification-list"

export default async function NotificationsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/login")
  }

  const userId = session.user.id

  // 通知一覧を取得（削除されていないもののみ）
  const notificationList = await withRLS(userId, async (tx) => {
    return await tx
      .select()
      .from(notifications)
      .where(isNull(notifications.deletedAt))
      .orderBy(desc(notifications.createdAt))
      .limit(100)
  })

  const unreadCount = notificationList.filter((n) => n.isRead === 0).length

  return (
    <div className="space-y-6">
      {/* ヘッダー */}
      <div className="border-b border-slate-200 pb-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 flex items-center gap-2 sm:gap-3">
              <Bell className="h-6 w-6 sm:h-8 sm:w-8 text-indigo-600" />
              通知
            </h1>
            <p className="mt-2 text-sm sm:text-base text-slate-600">
              システムからの通知を確認できます
            </p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            {unreadCount > 0 && (
              <Badge className="bg-indigo-600 hover:bg-indigo-600 text-sm sm:text-lg px-3 py-1.5 sm:px-4 sm:py-2">
                {unreadCount}件未読
              </Badge>
            )}
            {notificationList.length > 0 && <DeleteAllButton />}
          </div>
        </div>
      </div>

      {/* 通知一覧 */}
      <NotificationList notifications={notificationList} />
    </div>
  )
}
