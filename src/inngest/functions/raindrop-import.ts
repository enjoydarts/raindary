import { inngest } from "../client"
import { db } from "@/db"
import { users, raindrops, summaries } from "@/db/schema"
import { eq, isNull, sql } from "drizzle-orm"
import { decrypt } from "@/lib/crypto"
import { RaindropClient } from "@/lib/raindrop"
import { NonRetriableError } from "inngest"
import { notifyUser } from "@/lib/ably"

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

    // データ取り込み（新規取込件数のみカウント）
    const totalImported = await step.run("import-raindrops", async () => {
      let newCount = 0
      let totalCount = 0
      console.log("[raindrop-import] Starting import for user:", userId)

      for await (const items of client.fetchAllRaindrops({
        collectionId: filters?.collectionId,
      })) {
        console.log("[raindrop-import] Fetched batch of items:", items.length)

        // バッチ内のIDリストを取得
        const itemIds = items.map((item) => item._id)

        // このバッチ内で既存のIDを取得
        const existingInBatch = new Set(
          (
            await db
              .select({ id: raindrops.id })
              .from(raindrops)
              .where(
                sql`${raindrops.userId} = ${userId} AND ${raindrops.id} = ANY(${itemIds})`
              )
          ).map((r) => r.id)
        )

        // データベースにupsert
        for (const item of items) {
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
          }
          totalCount++
        }
      }
      console.log(
        `[raindrop-import] Total: ${totalCount}, New: ${newCount}, Updated: ${totalCount - newCount}`
      )
      return newCount
    })

    // 各記事の本文抽出イベントを発火
    const totalExtractRequested = await step.run("trigger-extracts", async () => {
      // 未要約の記事のみ抽出対象とする（最新50件まで）
      // summariesテーブルとLEFT JOINして、要約が存在しない記事のみ取得
      const unsummarizedRaindrops = await db
        .select({
          id: raindrops.id,
          createdAtRemote: raindrops.createdAtRemote,
        })
        .from(raindrops)
        .leftJoin(
          summaries,
          sql`${raindrops.id} = ${summaries.raindropId} AND ${raindrops.userId} = ${summaries.userId}`
        )
        .where(
          sql`${raindrops.userId} = ${userId} AND ${summaries.id} IS NULL`
        )
        .orderBy(sql`${raindrops.createdAtRemote} DESC`)
        .limit(50)

      let count = 0
      for (const raindrop of unsummarizedRaindrops) {
        await inngest.send({
          name: "raindrop/item.extract.requested",
          data: {
            userId: userId,
            raindropId: raindrop.id,
          },
        })
        count++
      }
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
