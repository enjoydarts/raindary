import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { withRLS } from "@/db/rls"
import { notifications } from "@/db/schema"
import { desc, isNull } from "drizzle-orm"
import { Bell, Check, X, Package } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MarkAsReadButton } from "./mark-as-read-button"
import { DeleteButton } from "./delete-button"
import { DeleteAllButton } from "./delete-all-button"
import { NotificationTime } from "./notification-time"

const TYPE_ICONS = {
  "import:completed": Package,
  "summary:completed": Check,
  "summary:failed": X,
} as const

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
      {notificationList.length === 0 ? (
        <Card>
          <CardContent className="p-8 sm:p-12 text-center">
            <Bell className="h-12 w-12 sm:h-16 sm:w-16 text-slate-300 mx-auto mb-4" />
            <p className="text-sm sm:text-base text-slate-500">通知はありません</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {notificationList.map((notification) => {
            const Icon = TYPE_ICONS[notification.type as keyof typeof TYPE_ICONS] || Bell
            const isUnread = notification.isRead === 0

            return (
              <Card
                key={notification.id}
                className={`card-hover ${isUnread ? "border-indigo-200 bg-indigo-50/30" : ""}`}
              >
                <CardContent className="p-4 sm:p-6">
                  <div className="flex items-start gap-3 sm:gap-4">
                    {/* アイコン */}
                    <div
                      className={`flex-shrink-0 rounded-lg p-2 sm:p-3 ${
                        notification.type === "summary:failed"
                          ? "bg-red-100"
                          : "bg-indigo-100"
                      }`}
                    >
                      <Icon
                        className={`h-5 w-5 sm:h-6 sm:w-6 ${
                          notification.type === "summary:failed"
                            ? "text-red-600"
                            : "text-indigo-600"
                        }`}
                      />
                    </div>

                    {/* コンテンツ */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 sm:gap-3 mb-2">
                        <h3 className="text-sm sm:text-base font-semibold text-slate-900">
                          {notification.title}
                        </h3>
                        {isUnread && (
                          <Badge variant="secondary" className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 text-xs sm:text-sm flex-shrink-0">
                            未読
                          </Badge>
                        )}
                      </div>
                      {notification.description && (
                        <p className="text-xs sm:text-sm text-slate-600 mb-3">
                          {notification.description}
                        </p>
                      )}
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                        <NotificationTime createdAt={notification.createdAt} />
                        <div className="flex items-center gap-2">
                          {isUnread && (
                            <MarkAsReadButton notificationId={notification.id} />
                          )}
                          <DeleteButton notificationId={notification.id} />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
