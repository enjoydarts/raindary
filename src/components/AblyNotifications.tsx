"use client"

import { useEffect, useRef } from "react"
import { Realtime } from "ably"
import { toast } from "sonner"

interface AblyNotificationsProps {
  userId: string
}

export function AblyNotifications({ userId }: AblyNotificationsProps) {
  // 処理済みメッセージIDを保持（重複排除用）
  const processedMessageIds = useRef(new Set<string>())

  useEffect(() => {
    // Ablyクライアント作成（Token Authentication使用）
    const ably = new Realtime({
      authUrl: "/api/ably-token",
      authMethod: "GET",
    })

    // ユーザー専用チャンネルを購読
    const channel = ably.channels.get(`user:${userId}`)

    // 取込完了イベント
    channel.subscribe("import:completed", (message) => {
      // 重複チェック
      if (processedMessageIds.current.has(message.id)) {
        console.log(`[ably] Duplicate message ignored: ${message.id}`)
        return
      }
      processedMessageIds.current.add(message.id)

      const data = message.data
      const count = data.count || 0
      toast.success("記事の取込が完了しました", {
        description:
          count > 0
            ? `新規に${count}件の記事を取り込みました。ページを更新して確認してください。`
            : "新規記事はありませんでした。",
        duration: Infinity, // 手動で閉じるまで表示
      })
    })

    // 要約完了イベント
    channel.subscribe("summary:completed", (message) => {
      // 重複チェック
      if (processedMessageIds.current.has(message.id)) {
        console.log(`[ably] Duplicate message ignored: ${message.id}`)
        return
      }
      processedMessageIds.current.add(message.id)

      const data = message.data
      toast.success("要約が完了しました", {
        description: data.title
          ? `「${data.title}」の要約が完了しました。ページを更新して確認してください。`
          : "ページを更新して確認してください。",
        duration: Infinity, // 手動で閉じるまで表示
      })
    })

    // 要約失敗イベント
    channel.subscribe("summary:failed", (message) => {
      // 重複チェック
      if (processedMessageIds.current.has(message.id)) {
        console.log(`[ably] Duplicate message ignored: ${message.id}`)
        return
      }
      processedMessageIds.current.add(message.id)

      const data = message.data
      toast.error("要約に失敗しました", {
        description: data.error || "エラーが発生しました",
        duration: Infinity, // 手動で閉じるまで表示
      })
    })

    // クリーンアップ
    return () => {
      channel.unsubscribe()
      ably.close()
    }
  }, [userId])

  return null // UIは表示しない（通知のみ）
}
