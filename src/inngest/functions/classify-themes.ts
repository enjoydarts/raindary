import { inngest } from "../client"
import { db } from "@/db"
import { summaries } from "@/db/schema"
import { eq, and, isNotNull, sql } from "drizzle-orm"
import { kmeans, assignThemeLabels } from "@/lib/clustering"
import { NonRetriableError } from "inngest"
import { notifyUser } from "@/lib/ably"

/**
 * テーマ自動分類関数
 * ユーザーの全要約をK-meansクラスタリングしてテーマを割り当て
 */
export const classifyThemes = inngest.createFunction(
  {
    id: "classify-themes",
    retries: 2,
    concurrency: [
      { limit: 5 }, // グローバル: 最大5ジョブ
      { limit: 1, key: "event.data.userId" }, // ユーザー単位: 1ジョブ
    ],
  },
  { event: "summaries/classify-themes.requested" },
  async ({ event, step }) => {
    const { userId } = event.data

    try {
      // 埋め込みベクトルを持つ完了済み要約を取得
      const summariesWithEmbedding = await step.run("fetch-summaries", async () => {
        return await db
          .select({
            id: summaries.id,
            summary: summaries.summary,
            embedding: summaries.embedding,
          })
          .from(summaries)
          .where(
            and(
              eq(summaries.userId, userId),
              eq(summaries.status, "completed"),
              isNotNull(summaries.embedding)
            )
          )
          .orderBy(summaries.createdAt)
      })

      if (summariesWithEmbedding.length === 0) {
        console.log(`[classify-themes] No summaries with embeddings for user: ${userId}`)
        return {
          success: true,
          userId,
          totalSummaries: 0,
          message: "No summaries to classify",
        }
      }

      console.log(
        `[classify-themes] Found ${summariesWithEmbedding.length} summaries for user: ${userId}`
      )

      // K-meansクラスタリング実行
      const result = await step.run(
        "kmeans-clustering",
        async (): Promise<{
          clusters: number[]
          themeEntries: Array<[string, string]>
        }> => {
          const vectors = summariesWithEmbedding.map((s) => s.embedding as number[])
          const k = Math.min(5, Math.max(2, Math.floor(vectors.length / 10))) // 動的にクラスタ数を決定

          console.log(
            `[classify-themes] Running K-means with k=${k} on ${vectors.length} vectors`
          )

          const clusterAssignments = kmeans(vectors, k)

          // LLMでテーマラベルを動的に生成
          const summaryData = summariesWithEmbedding.map((s) => ({
            id: s.id,
            summary: s.summary,
          }))
          const themes = await assignThemeLabels(clusterAssignments, summaryData)

          // MapをArray形式に変換（Inngestはシリアライズ可能な形式が必要）
          return {
            clusters: clusterAssignments,
            themeEntries: Array.from(themes.entries()),
          }
        }
      )

      const themeMap = new Map<string, string>(result.themeEntries)
      const clusters: number[] = result.clusters

      // DBを更新
      const updateCount = await step.run("update-themes", async () => {
        let count = 0

        // MapをArray.fromで配列に変換してからループ
        for (const [summaryId, theme] of Array.from(themeMap)) {
          await db
            .update(summaries)
            .set({ theme })
            .where(eq(summaries.id, summaryId))
          count++
        }

        console.log(`[classify-themes] Updated ${count} summaries with themes`)
        return count
      })

      // テーマ別の統計を計算
      const themeStats = await step.run("calculate-stats", async () => {
        const stats = new Map<string, number>()

        for (const theme of Array.from(themeMap.values())) {
          stats.set(theme, (stats.get(theme) || 0) + 1)
        }

        return Object.fromEntries(Array.from(stats))
      })

      console.log(`[classify-themes] Theme distribution:`, themeStats)

      // ユーザーに通知
      await step.run("notify-user", async () => {
        await notifyUser(userId, "themes:completed", {
          count: updateCount,
          themeDistribution: themeStats,
        })
      })

      return {
        success: true,
        userId,
        totalSummaries: summariesWithEmbedding.length,
        updatedCount: updateCount,
        themeDistribution: themeStats,
      }
    } catch (error) {
      console.error(`[classify-themes] Error:`, error)

      // エラー通知を送信
      await step.run("notify-error", async () => {
        await notifyUser(userId, "themes:failed", {
          error: error instanceof Error ? error.message : "Unknown error",
        })
      })

      throw error
    }
  }
)
