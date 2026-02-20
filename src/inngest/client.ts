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
  "summaries/classify-themes.requested": {
    data: {
      userId: string
      force?: boolean // 強制再分類フラグ
    }
  }
  "embeddings/regenerate.requested": {
    data: {
      userId: string
    }
  }
  "digests/generate-weekly.requested": {
    data: {
      userId: string
      periodStart?: string // YYYY-MM-DD (JST)
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
