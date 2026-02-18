"use client"

interface NotificationTimeProps {
  createdAt: Date
}

export function NotificationTime({ createdAt }: NotificationTimeProps) {
  return (
    <span className="text-xs text-slate-500">
      {new Date(createdAt).toLocaleString("ja-JP", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "Asia/Tokyo",
      })}
    </span>
  )
}
