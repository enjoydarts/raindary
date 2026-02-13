import { inngest } from "../client"
import { db } from "@/db"
import { raindrops, summaries } from "@/db/schema"
import { eq, and } from "drizzle-orm"
import { NonRetriableError } from "inngest"
import { sendJsonMessage, MODELS } from "@/lib/anthropic"
import { trackAnthropicUsage } from "@/lib/cost-tracker"
import { buildExtractFactsPrompt, ExtractedFacts } from "../prompts/extract-facts"
import {
  buildGenerateSummaryPrompt,
  GeneratedSummary,
  Tone,
} from "../prompts/generate-summary"

/**
 * AI要約生成関数
 */
export const raindropSummarize = inngest.createFunction(
  {
    id: "raindrop-summarize",
    retries: 4,
    concurrency: [
      { limit: 5 }, // グローバル: 最大5ジョブ（無料プラン制限）
      { limit: 2, key: "event.data.userId" }, // ユーザー単位: 2ジョブ
    ],
    onFailure: async ({ event, error }) => {
      // 失敗時にDBに記録
      const { userId, raindropId, tone } = event.data.event.data

      try {
        await db
          .update(summaries)
          .set({
            status: "failed",
            error: error.message,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(summaries.userId, userId),
              eq(summaries.raindropId, raindropId),
              eq(summaries.tone, tone)
            )
          )
      } catch (dbError) {
        console.error("Failed to update summary status:", dbError)
      }
    },
  },
  { event: "raindrop/item.summarize.requested" },
  async ({ event, step }) => {
    const { userId, raindropId, tone } = event.data

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

      if (!record.excerpt || record.excerpt.length < 100) {
        throw new NonRetriableError(
          `Raindrop has no extracted text: raindropId=${raindropId}`
        )
      }

      return record
    })

    // Summaryレコードを作成
    const summary = await step.run("create-summary", async () => {
      const [record] = await db
        .insert(summaries)
        .values({
          userId,
          raindropId,
          tone: tone as Tone,
          summary: "", // 一旦空で作成
          model: MODELS.SONNET,
          status: "processing",
        })
        .onConflictDoUpdate({
          target: [summaries.userId, summaries.raindropId, summaries.tone],
          set: {
            status: "processing",
            error: null,
            updatedAt: new Date(),
          },
        })
        .returning()

      return record
    })

    // Step1: 事実抽出（Haiku）
    const facts = await step.run("extract-facts", async () => {
      const { system, userMessage } = buildExtractFactsPrompt(raindrop.excerpt!)

      const response = await sendJsonMessage<ExtractedFacts>({
        model: MODELS.HAIKU,
        system,
        messages: [{ role: "user", content: userMessage }],
        maxTokens: 1024,
      })

      // コスト記録
      await trackAnthropicUsage({
        userId,
        summaryId: summary.id!,
        model: MODELS.HAIKU,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      })

      return response.content
    })

    // Step2: 要約生成（Sonnet）
    const result = await step.run("generate-summary", async () => {
      const { system, userMessage } = buildGenerateSummaryPrompt(facts, tone as Tone)

      const response = await sendJsonMessage<GeneratedSummary>({
        model: MODELS.SONNET,
        system,
        messages: [{ role: "user", content: userMessage }],
        maxTokens: 2048,
      })

      // コスト記録
      await trackAnthropicUsage({
        userId,
        summaryId: summary.id!,
        model: MODELS.SONNET,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      })

      return response.content
    })

    // DBを更新
    await step.run("update-summary", async () => {
      await db
        .update(summaries)
        .set({
          summary: result.summary,
          rating: result.rating,
          ratingReason: result.reason,
          factsJson: facts,
          status: "completed",
          updatedAt: new Date(),
        })
        .where(eq(summaries.id, summary.id!))
    })

    return {
      success: true,
      userId,
      raindropId,
      tone,
      summaryId: summary.id!,
      summaryLength: result.summary.length,
      rating: result.rating,
    }
  }
)
