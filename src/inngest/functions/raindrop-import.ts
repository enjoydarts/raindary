import { inngest } from "../client"
import { db } from "@/db"
import { users, raindrops } from "@/db/schema"
import { eq } from "drizzle-orm"
import { decrypt } from "@/lib/crypto"
import { RaindropClient } from "@/lib/raindrop"
import { NonRetriableError } from "inngest"

/**
 * Raindrop データ取り込み関数
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

    // データ取り込み
    let totalImported = 0
    let totalExtractRequested = 0

    await step.run("import-raindrops", async () => {
      for await (const items of client.fetchAllRaindrops({
        collectionId: filters?.collectionId,
      })) {
        // データベースにupsert
        for (const item of items) {
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

          totalImported++
        }
      }
    })

    // 各記事の本文抽出イベントを発火
    await step.run("trigger-extracts", async () => {
      // 最新の50件のみ抽出対象とする（初回同期時の負荷軽減）
      const recentRaindrops = await db
        .select()
        .from(raindrops)
        .where(eq(raindrops.userId, userId))
        .orderBy(raindrops.createdAtRemote)
        .limit(50)

      for (const raindrop of recentRaindrops) {
        await inngest.send({
          name: "raindrop/item.extract.requested",
          data: {
            userId: userId,
            raindropId: raindrop.id,
          },
        })
        totalExtractRequested++
      }
    })

    return {
      success: true,
      totalImported,
      totalExtractRequested,
      userId,
    }
  }
)
