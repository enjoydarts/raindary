import { inngest } from "../client"
import { db } from "@/db"
import { summaries } from "@/db/schema"
import { eq, and, isNotNull, sql } from "drizzle-orm"
import { kmeans, assignThemeLabels } from "@/lib/clustering"
import { cosineSimilarity } from "@/lib/embeddings"
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
      // 既存のテーマ一覧を取得
      const existingThemes = await step.run("fetch-existing-themes", async () => {
        const themesResult = await db
          .selectDistinct({ theme: summaries.theme })
          .from(summaries)
          .where(
            and(
              eq(summaries.userId, userId),
              isNotNull(summaries.theme)
            )
          )
        return themesResult.map(t => t.theme!).filter(t => t)
      })

      console.log(`[classify-themes] Found ${existingThemes.length} existing themes`)

      // theme=nullの要約を取得（新規分類対象）
      const unclassifiedSummaries = await step.run("fetch-unclassified", async () => {
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
              isNotNull(summaries.embedding),
              sql`${summaries.theme} IS NULL`
            )
          )
          .orderBy(summaries.createdAt)
      })

      console.log(`[classify-themes] Found ${unclassifiedSummaries.length} unclassified summaries`)

      if (unclassifiedSummaries.length === 0) {
        console.log(`[classify-themes] No unclassified summaries for user: ${userId}`)
        return {
          success: true,
          userId,
          totalSummaries: 0,
          message: "No summaries to classify",
        }
      }

      // 既存テーマがない場合：初回実行として全件K-meansクラスタリング
      if (existingThemes.length === 0) {
        console.log(`[classify-themes] No existing themes, running full K-means clustering`)

        const result = await step.run(
          "kmeans-clustering",
          async (): Promise<{
            clusters: number[]
            themeEntries: Array<[string, string]>
          }> => {
            const vectors = unclassifiedSummaries.map((s) => s.embedding as number[])
            const k = Math.min(15, Math.max(3, Math.floor(vectors.length / 10))) // 動的にクラスタ数を決定（上限15個）

            console.log(
              `[classify-themes] Running K-means with k=${k} on ${vectors.length} vectors`
            )

            const clusterAssignments = kmeans(vectors, k)

            // LLMでテーマラベルを動的に生成
            const summaryData = unclassifiedSummaries.map((s) => ({
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

        // DBを更新
        const updateCount = await step.run("update-themes", async () => {
          let count = 0

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
          totalSummaries: unclassifiedSummaries.length,
          updatedCount: updateCount,
          themeDistribution: themeStats,
          mode: "initial",
        }
      }

      // 既存テーマがある場合：増分更新（未分類の要約を既存テーマに割り当て）
      console.log(`[classify-themes] Existing themes found, running incremental assignment`)

      // 各テーマの代表ベクトル（centroid）を計算
      const themeCentroids = await step.run("calculate-centroids", async () => {
        const centroids = new Map<string, number[]>()

        for (const theme of existingThemes) {
          // 各テーマの要約を最大20件取得
          const themeSummaries = await db
            .select({
              embedding: summaries.embedding,
            })
            .from(summaries)
            .where(
              and(
                eq(summaries.userId, userId),
                eq(summaries.theme, theme),
                isNotNull(summaries.embedding)
              )
            )
            .limit(20)

          if (themeSummaries.length === 0) continue

          // ベクトルの平均を計算（centroid）
          const vectors = themeSummaries.map(s => s.embedding as number[])
          const dim = vectors[0].length
          const centroid = new Array(dim).fill(0)

          for (const vector of vectors) {
            for (let i = 0; i < dim; i++) {
              centroid[i] += vector[i]
            }
          }

          for (let i = 0; i < dim; i++) {
            centroid[i] /= vectors.length
          }

          centroids.set(theme, centroid)
        }

        console.log(`[classify-themes] Calculated ${centroids.size} theme centroids`)
        return Array.from(centroids.entries())
      })

      const centroidMap = new Map<string, number[]>(themeCentroids)

      // 未分類の要約を最も近いテーマに割り当て
      const assignmentResult = await step.run("assign-to-nearest-theme", async () => {
        const assignments = new Map<string, string>()

        for (const summary of unclassifiedSummaries) {
          const embedding = summary.embedding as number[]
          let maxSimilarity = -Infinity
          let bestTheme = existingThemes[0] // デフォルト

          // 最も類似度の高いテーマを探す
          for (const [theme, centroid] of centroidMap.entries()) {
            const similarity = cosineSimilarity(embedding, centroid)
            if (similarity > maxSimilarity) {
              maxSimilarity = similarity
              bestTheme = theme
            }
          }

          assignments.set(summary.id, bestTheme)
        }

        console.log(`[classify-themes] Assigned ${assignments.size} summaries to existing themes`)
        return Array.from(assignments.entries())
      })

      const assignmentMap = new Map<string, string>(assignmentResult)

      // DBを更新
      const updateCount = await step.run("update-themes-incremental", async () => {
        let count = 0

        for (const [summaryId, theme] of assignmentMap.entries()) {
          await db
            .update(summaries)
            .set({ theme })
            .where(eq(summaries.id, summaryId))
          count++
        }

        console.log(`[classify-themes] Updated ${count} summaries with existing themes`)
        return count
      })

      // テーマ別の統計を計算
      const themeStats = await step.run("calculate-stats-incremental", async () => {
        const stats = new Map<string, number>()

        for (const theme of assignmentMap.values()) {
          stats.set(theme, (stats.get(theme) || 0) + 1)
        }

        return Object.fromEntries(Array.from(stats))
      })

      console.log(`[classify-themes] Theme distribution (incremental):`, themeStats)

      // ユーザーに通知
      await step.run("notify-user-incremental", async () => {
        await notifyUser(userId, "themes:completed", {
          count: updateCount,
          themeDistribution: themeStats,
        })
      })

      return {
        success: true,
        userId,
        totalSummaries: unclassifiedSummaries.length,
        updatedCount: updateCount,
        themeDistribution: themeStats,
        mode: "incremental",
        existingThemeCount: existingThemes.length,
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
