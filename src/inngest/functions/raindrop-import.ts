import { inngest } from "../client"
import { db } from "@/db"
import { users, raindrops } from "@/db/schema"
import { eq, inArray, and } from "drizzle-orm"
import { decrypt } from "@/lib/crypto"
import { RaindropClient } from "@/lib/raindrop"
import { NonRetriableError } from "inngest"
import { notifyUser } from "@/lib/ably"

type SummaryTone = "snarky" | "neutral" | "enthusiastic" | "casual"

/**
 * Raindrop データ取り込み関数
 *
 * 注: このInngest関数はサービスロールとして動作します。
 * RLSが有効な場合、Supabaseのサービスロールキー（service_role）を
 * DATABASE_URLに使用することで、すべてのデータにアクセス可能です。
 */
export const raindropImport = inngest.createFunction(
  {
    id: "raindrop-import",
    retries: 3,
    concurrency: [
      { limit: 5 }, // グローバル: 最大5ジョブ（無料プラン制限）
      { limit: 1, key: "event.data.userId" }, // ユーザー単位: 1ジョブのみ
    ],
  },
  { event: "raindrop/import.requested" },
  async ({ event, step }) => {
    const { userId, filters } = event.data

    // ユーザー情報とトークンを取得
    const user = await step.run("fetch-user", async () => {
      const [userRecord] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)

      if (!userRecord) {
        throw new NonRetriableError(`User not found: ${userId}`)
      }

      if (!userRecord.raindropAccessToken) {
        throw new NonRetriableError(
          `Raindrop access token not found for user: ${userId}`
        )
      }

      return userRecord
    })

    // トークンを復号化
    const accessToken = decrypt(user.raindropAccessToken!)

    // Raindrop APIクライアントを初期化
    const client = new RaindropClient(accessToken)

    const previousImportAt = user.raindropLastImportedAt
      ? new Date(user.raindropLastImportedAt)
      : null

    // データ取り込み（新規取込記事のIDリストを返す）
    const { newCount: totalImported, newRaindropIds } = await step.run(
      "import-raindrops",
      async () => {
        let newCount = 0
        let totalCount = 0
        const newIds: number[] = []
        let shouldStop = false
        console.log("[raindrop-import] Starting import for user:", userId)

        for await (const items of client.fetchAllRaindrops({
          collectionId: filters?.collectionId,
        })) {
          if (shouldStop) {
            break
          }
          console.log("[raindrop-import] Fetched batch of items:", items.length)

          // バッチ内のIDリストを取得
          const itemIds = items.map((item) => item._id)

          // このバッチ内で既存のIDを取得
          const existingInBatch = new Set(
            (
              await db
                .select({ id: raindrops.id })
                .from(raindrops)
                .where(and(eq(raindrops.userId, userId), inArray(raindrops.id, itemIds)))
            ).map((r) => r.id)
          )

          // データベースにupsert
          for (const item of items) {
            if (previousImportAt) {
              const itemCreatedAt = new Date(item.created)
              if (itemCreatedAt <= previousImportAt) {
                shouldStop = true
                continue
              }
            }

            const isNew = !existingInBatch.has(item._id)

            await db
              .insert(raindrops)
              .values({
                id: item._id,
                userId: userId,
                title: item.title,
                link: item.link,
                excerpt: item.excerpt || "",
                cover: item.cover || "",
                collectionId: item.collection.$id,
                tags: item.tags,
                createdAtRemote: new Date(item.created),
                syncedAt: new Date(),
              })
              .onConflictDoUpdate({
                target: [raindrops.userId, raindrops.id],
                set: {
                  title: item.title,
                  link: item.link,
                  excerpt: item.excerpt || "",
                  cover: item.cover || "",
                  collectionId: item.collection.$id,
                  tags: item.tags,
                  syncedAt: new Date(),
                },
              })

            if (isNew) {
              newCount++
              newIds.push(item._id)
            }
            totalCount++
          }
        }
        console.log(
          `[raindrop-import] Total: ${totalCount}, New: ${newCount}, Updated: ${totalCount - newCount}`
        )
        return { newCount, newRaindropIds: newIds }
      }
    )

    await step.run("mark-last-imported-at", async () => {
      await db
        .update(users)
        .set({
          raindropLastImportedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
    })

    // 新規取込記事のみ本文抽出イベントを発火（全新規記事）
    const totalExtractRequested = await step.run("trigger-extracts", async () => {
      // 新規記事がない場合はスキップ
      if (newRaindropIds.length === 0) {
        console.log("[raindrop-import] No new raindrops to extract")
        return 0
      }

      // 新規記事を抽出対象とする
      const newRaindropsToExtract = await db
        .select({
          id: raindrops.id,
        })
        .from(raindrops)
        .where(and(eq(raindrops.userId, userId), inArray(raindrops.id, newRaindropIds)))

      let count = 0
      const tone: SummaryTone =
        user.defaultSummaryTone === "snarky" ||
        user.defaultSummaryTone === "enthusiastic" ||
        user.defaultSummaryTone === "casual"
          ? user.defaultSummaryTone
          : "neutral"

      for (const raindrop of newRaindropsToExtract) {
        await inngest.send({
          name: "raindrop/item.extract.requested",
          data: {
            userId: userId,
            raindropId: raindrop.id,
            tone,
          },
        })
        count++
      }
      console.log(`[raindrop-import] Triggered extract for ${count} new raindrops`)
      return count
    })

    // Ably通知を送信
    await step.run("notify-user", async () => {
      console.log("[raindrop-import] Sending notification - totalImported:", totalImported, "totalExtractRequested:", totalExtractRequested)
      await notifyUser(userId, "import:completed", {
        count: totalImported,
        extractRequested: totalExtractRequested,
      })
    })

    console.log("[raindrop-import] Function completed - totalImported:", totalImported, "totalExtractRequested:", totalExtractRequested)
    return {
      success: true,
      totalImported,
      totalExtractRequested,
      userId,
    }
  }
)
