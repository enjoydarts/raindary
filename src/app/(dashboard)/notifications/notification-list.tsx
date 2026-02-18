"use client"

import { useState, useMemo } from "react"
import { Bell, Package, Check, X } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MarkAsReadButton } from "./mark-as-read-button"
import { DeleteButton } from "./delete-button"
import { NotificationTime } from "./notification-time"

const TYPE_ICONS = {
  "import:completed": Package,
  "summary:completed": Check,
  "summary:failed": X,
} as const

interface Notification {
  id: string
  type: string
  title: string
  description: string | null
  isRead: number
  createdAt: Date
}

interface NotificationListProps {
  notifications: Notification[]
}

export function NotificationList({ notifications }: NotificationListProps) {
  const [showUnreadOnly, setShowUnreadOnly] = useState(false)

  const filteredNotifications = useMemo(() => {
    if (!showUnreadOnly) {
      return notifications
    }
    return notifications.filter((n) => n.isRead === 0)
  }, [notifications, showUnreadOnly])

  const unreadCount = notifications.filter((n) => n.isRead === 0).length

  return (
    <>
      {/* フィルタートグル */}
      {notifications.length > 0 && (
        <div className="flex items-center gap-2 mb-4">
          <Button
            variant={showUnreadOnly ? "default" : "outline"}
            size="sm"
            onClick={() => setShowUnreadOnly(!showUnreadOnly)}
            className={showUnreadOnly ? "bg-indigo-600 hover:bg-indigo-700" : ""}
          >
            <Bell className="h-3.5 w-3.5 mr-1.5" />
            未読のみ表示
            {unreadCount > 0 && (
              <Badge className="ml-2 bg-white text-indigo-600 hover:bg-white">
                {unreadCount}
              </Badge>
            )}
          </Button>
        </div>
      )}

      {/* 通知一覧 */}
      {filteredNotifications.length === 0 ? (
        <Card>
          <CardContent className="p-8 sm:p-12 text-center">
            <Bell className="h-12 w-12 sm:h-16 sm:w-16 text-slate-300 mx-auto mb-4" />
            <p className="text-sm sm:text-base text-slate-500">
              {showUnreadOnly ? "未読の通知はありません" : "通知はありません"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => {
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
    </>
  )
}
