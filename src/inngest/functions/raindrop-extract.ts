import { inngest } from "../client"
import { db } from "@/db"
import { raindrops } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { NonRetriableError } from "inngest"

interface ExtractResponse {
  title: string
  text: string
  length: number
  language: string
  method: string
}

/**
 * 記事本文抽出関数
 */
export const raindropExtract = inngest.createFunction(
  {
    id: "raindrop-extract",
    retries: 2,
    concurrency: [
      { limit: 5 }, // グローバル: 最大5ジョブ（無料プラン制限）
      { limit: 2, key: "event.data.userId" }, // ユーザー単位: 2ジョブ
    ],
  },
  { event: "raindrop/item.extract.requested" },
  async ({ event, step }) => {
    const { userId, raindropId } = event.data

    // Raindropを取得
    const raindrop = await step.run("fetch-raindrop", async () => {
      const [record] = await db
        .select()
        .from(raindrops)
        .where(and(eq(raindrops.userId, userId), eq(raindrops.id, raindropId)))
        .limit(1)

      if (!record) {
        throw new NonRetriableError(
          `Raindrop not found: userId=${userId}, raindropId=${raindropId}`
        )
      }

      return record
    })

    // Python抽出サービスを呼び出し
    const extractResult = await step.run("extract-content", async () => {
      const extractUrl = process.env.EXTRACT_API_URL || "http://extract:8000/extract"

      const response = await fetch(extractUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          url: raindrop.link,
        }),
      })

      if (!response.ok) {
        const error = await response.text()

        // 404や422は記事として抽出できないので、リトライしない
        if (response.status === 404 || response.status === 422) {
          throw new NonRetriableError(
            `Content extraction failed (${response.status}): ${error}`
          )
        }

        throw new Error(`Extract service error (${response.status}): ${error}`)
      }

      const data: ExtractResponse = await response.json()
      return data
    })

    // 抽出結果をメタデータとして保存（将来的にはextracted_textカラムを追加）
    // 現状はexcerptを更新
    await step.run("save-extracted-text", async () => {
      const excerpt = extractResult.text.substring(0, 500) // 最初の500文字

      await db
        .update(raindrops)
        .set({
          excerpt,
        })
        .where(and(eq(raindrops.userId, userId), eq(raindrops.id, raindropId)))
    })

    // 要約生成イベントを発火（デフォルトでneutralトーン）
    await step.run("trigger-summarize", async () => {
      await inngest.send({
        name: "raindrop/item.summarize.requested",
        data: {
          userId,
          raindropId,
          tone: "neutral",
        },
      })
    })

    return {
      success: true,
      userId,
      raindropId,
      extractedLength: extractResult.length,
      language: extractResult.language,
    }
  }
)
