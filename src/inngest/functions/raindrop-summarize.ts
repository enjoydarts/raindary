import { inngest } from "../client"
import { db } from "@/db"
import { raindrops, summaries, users } from "@/db/schema"
import { eq, and, desc, isNotNull } from "drizzle-orm"
import { NonRetriableError } from "inngest"
import { sendJsonMessage, MODELS } from "@/lib/anthropic"
import { trackAnthropicUsage } from "@/lib/cost-tracker"
import { getMonthlyBudgetUsd, getMonthlyCostUsd } from "@/lib/cost-tracker"
import { buildExtractFactsPrompt, ExtractedFacts } from "../prompts/extract-facts"
import {
  buildGenerateSummaryPrompt,
  GeneratedSummary,
  Tone,
} from "../prompts/generate-summary"
import { notifyUser } from "@/lib/ably"
import { generateEmbedding } from "@/lib/embeddings"
import { decrypt } from "@/lib/crypto"

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
      const { userId, raindropId, tone, summaryId } = event.data.event.data

      try {
        if (summaryId) {
          // summaryIdがある場合はIDで更新
          await db
            .update(summaries)
            .set({
              status: "failed",
              error: error.message,
              updatedAt: new Date(),
            })
            .where(eq(summaries.id, summaryId))
        } else {
          // summaryIdがない場合はユーザーID+raindropID+toneで更新
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
        }

        // Ably通知を送信
        await notifyUser(userId, "summary:failed", {
          raindropId,
          summaryId: summaryId || null,
          error: error.message,
        })
      } catch (dbError) {
        console.error("Failed to update summary status:", dbError)
      }
    },
  },
  { event: "raindrop/item.summarize.requested" },
  async ({ event, step }) => {
    const { userId, raindropId, tone, summaryId } = event.data

    const apiKeys = await step.run("fetch-user-api-keys", async () => {
      const [user] = await db
        .select({
          anthropicApiKeyEncrypted: users.anthropicApiKeyEncrypted,
          openaiApiKeyEncrypted: users.openaiApiKeyEncrypted,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)

      if (!user) {
        throw new NonRetriableError(`User not found: ${userId}`)
      }

      if (!user.anthropicApiKeyEncrypted) {
        throw new NonRetriableError(
          "Anthropic API key is not configured. Please set it in /settings."
        )
      }

      return {
        anthropicApiKey: decrypt(user.anthropicApiKeyEncrypted),
        openaiApiKey: user.openaiApiKeyEncrypted
          ? decrypt(user.openaiApiKeyEncrypted)
          : undefined,
      }
    })

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

    // Summaryレコードを作成または更新
    const summary = await step.run("create-or-update-summary", async () => {
      if (summaryId) {
        // summaryIdがある場合は既存レコードを更新
        const [record] = await db
          .update(summaries)
          .set({
            status: "processing",
            error: null,
            model: MODELS.SONNET,
            updatedAt: new Date(),
          })
          .where(eq(summaries.id, summaryId))
          .returning()

        if (!record) {
          throw new NonRetriableError(`Summary not found: summaryId=${summaryId}`)
        }

        return record
      } else {
        // summaryIdがない場合は新規作成（後方互換性のため）
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
      }
    })

    // 予算上限チェック
    await step.run("check-budget-guardrail", async () => {
      const budgetUsd = await getMonthlyBudgetUsd(userId)
      if (!budgetUsd) {
        return
      }

      const currentMonthlyCost = await getMonthlyCostUsd(userId)
      if (currentMonthlyCost < budgetUsd) {
        return
      }

      await db
        .update(summaries)
        .set({
          status: "failed",
          error: `月次予算上限（$${budgetUsd.toFixed(2)}）に到達したため処理を停止しました`,
          updatedAt: new Date(),
        })
        .where(eq(summaries.id, summary.id))

      await notifyUser(userId, "summary:failed", {
        raindropId,
        summaryId: summary.id,
        error: `月次予算上限（$${budgetUsd.toFixed(2)}）に到達しました`,
      })

      throw new NonRetriableError("Monthly budget exceeded")
    })

    // Step1: 事実抽出（Haiku）
    const facts = await step.run("extract-facts", async () => {
      const { system, userMessage } = buildExtractFactsPrompt(raindrop.excerpt!)

      const response = await sendJsonMessage<ExtractedFacts>({
        apiKey: apiKeys.anthropicApiKey,
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
      // 直近の低評価フィードバックを再生成時に反映
      const feedbackRows = await db
        .select({
          userRating: summaries.userRating,
          userFeedback: summaries.userFeedback,
        })
        .from(summaries)
        .where(
          and(
            eq(summaries.userId, userId),
            eq(summaries.tone, tone as Tone),
            isNotNull(summaries.userFeedback)
          )
        )
        .orderBy(desc(summaries.updatedAt))
        .limit(3)

      const feedbackContext = feedbackRows
        .map(
          (row, idx) =>
            `${idx + 1}. 評価: ${row.userRating ?? "未設定"} / コメント: ${row.userFeedback}`
        )
        .join("\n")

      const { system, userMessage } = buildGenerateSummaryPrompt(
        facts,
        tone as Tone,
        feedbackContext || undefined
      )

      const response = await sendJsonMessage<GeneratedSummary>({
        apiKey: apiKeys.anthropicApiKey,
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

    // Step3: 埋め込みベクトル生成（関連記事提案用）
    const embedding = await step.run("generate-embedding", async () => {
      try {
        // 要約テキスト + 記事タイトルで埋め込みを生成
        const textForEmbedding = `${raindrop.title}\n\n${result.summary}`
        return await generateEmbedding(textForEmbedding, {
          apiKey: apiKeys.openaiApiKey,
          userId,
          summaryId: summary.id!,
        })
      } catch (error) {
        console.error("[raindrop-summarize] Failed to generate embedding:", error)
        // 埋め込み生成失敗は致命的ではないので、空配列を返す
        return []
      }
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
          embedding: embedding.length > 0 ? embedding : null,
          status: "completed",
          updatedAt: new Date(),
        })
        .where(eq(summaries.id, summary.id!))
    })

    // Ably通知を送信
    await step.run("notify-user", async () => {
      await notifyUser(userId, "summary:completed", {
        raindropId,
        summaryId: summary.id!,
        title: raindrop.title,
        rating: result.rating,
      })
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
