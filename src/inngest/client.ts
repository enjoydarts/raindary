import { Inngest, EventSchemas } from "inngest"

/**
 * イベント型定義
 */
export type Events = {
  "raindrop/import.requested": {
    data: {
      userId: string
      filters?: {
        collectionId?: number
      }
    }
  }
  "raindrop/item.extract.requested": {
    data: {
      userId: string
      raindropId: number
      summaryId?: string // オプショナル: 要約レコードのID（作成済みの場合）
      tone?: "snarky" | "neutral" | "enthusiastic" | "casual" // オプショナル: 要約のトーン
    }
  }
  "raindrop/item.summarize.requested": {
    data: {
      userId: string
      raindropId: number
      summaryId?: string // オプショナル: 要約レコードのID（作成済みの場合）
      tone: "snarky" | "neutral" | "enthusiastic" | "casual"
    }
  }
}

/**
 * Inngestクライアント
 */
export const inngest = new Inngest({
  id: process.env.INNGEST_APP_ID || "raindary",
  schemas: new EventSchemas().fromRecord<Events>(),
})
