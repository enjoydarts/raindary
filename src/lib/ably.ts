import { Realtime } from "ably"
import { db } from "@/db"
import { notifications } from "@/db/schema"

/**
 * Ablyサーバークライアント（Inngest関数から使用）
 */
let ablyClient: Realtime | null = null

export function getAblyClient() {
  if (!process.env.ABLY_API_KEY) {
    console.warn("[ably] ABLY_API_KEY not set, notifications disabled")
    return null
  }

  if (!ablyClient) {
    ablyClient = new Realtime({
      key: process.env.ABLY_API_KEY,
    })
  }

  return ablyClient
}

/**
 * 通知タイトルと説明文を生成
 */
function getNotificationContent(eventName: string, data: Record<string, any>) {
  switch (eventName) {
    case "import:completed":
      return {
        title: "記事の取込が完了しました",
        description:
          data.count > 0
            ? `新規に${data.count}件の記事を取り込みました。ページを更新して確認してください。`
            : "新規記事はありませんでした。",
      }
    case "summary:completed":
      return {
        title: "要約が完了しました",
        description: data.title
          ? `「${data.title}」の要約が完了しました。ページを更新して確認してください。`
          : "ページを更新して確認してください。",
      }
    case "summary:failed":
      return {
        title: "要約に失敗しました",
        description: data.error || "エラーが発生しました",
      }
    case "themes:completed":
      return {
        title: "テーマ分類が完了しました",
        description: data.count > 0
          ? `${data.count}件の要約にテーマを割り当てました。ページを更新して確認してください。`
          : "分類対象の要約がありませんでした。",
      }
    case "themes:failed":
      return {
        title: "テーマ分類に失敗しました",
        description: data.error || "エラーが発生しました",
      }
    default:
      return {
        title: "通知",
        description: JSON.stringify(data),
      }
  }
}

/**
 * ユーザーに通知を送信し、DBに保存
 */
export async function notifyUser(
  userId: string,
  eventName: string,
  data: Record<string, any>
) {
  const { title, description } = getNotificationContent(eventName, data)

  // DBに通知を保存
  try {
    await db.insert(notifications).values({
      userId,
      type: eventName,
      title,
      description,
      data,
      isRead: 0,
    })
    console.log(`[ably] Notification saved to DB: ${eventName} for user:${userId}`)
  } catch (error) {
    console.error(`[ably] Failed to save notification to DB:`, error)
  }

  // Ablyでリアルタイム通知を送信
  const client = getAblyClient()
  if (!client) {
    console.warn(`[ably] Skip real-time notification: ${eventName}`)
    return
  }

  try {
    const channel = client.channels.get(`user:${userId}`)
    await channel.publish(eventName, data)
    console.log(`[ably] Real-time notification sent: ${eventName} to user:${userId}`)
  } catch (error) {
    console.error(`[ably] Failed to send real-time notification:`, error)
  }
}
