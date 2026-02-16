"use server"

import { auth } from "@/auth"
import { inngest } from "@/inngest/client"
import { revalidatePath } from "next/cache"

export async function triggerImport() {
  console.log("[triggerImport] Function called")

  const session = await auth()
  console.log("[triggerImport] Session:", session?.user?.id ? "authenticated" : "not authenticated")

  if (!session?.user?.id) {
    console.error("[triggerImport] Unauthorized - no session")
    throw new Error("Unauthorized")
  }

  console.log("[triggerImport] Starting import for user:", session.user.id)

  // 環境変数の確認
  console.log("[triggerImport] Environment check:", {
    hasEventKey: !!process.env.INNGEST_EVENT_KEY,
    hasSigningKey: !!process.env.INNGEST_SIGNING_KEY,
    inngestDev: process.env.INNGEST_DEV,
  })

  try {
    // Inngestイベントを直接送信
    console.log("[triggerImport] Sending Inngest event...")
    const result = await inngest.send({
      name: "raindrop/import.requested",
      data: {
        userId: session.user.id,
      },
    })
    console.log("[triggerImport] Inngest event sent successfully:", JSON.stringify(result))
  } catch (error) {
    console.error("[triggerImport] Failed to send Inngest event:", error)
    console.error("[triggerImport] Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    })
    throw new Error(`Inngestイベント送信に失敗: ${error instanceof Error ? error.message : String(error)}`)
  }

  // ページをリフレッシュ
  revalidatePath("/raindrops")

  console.log("[triggerImport] Import triggered successfully")
  return { success: true }
}

export async function generateSummary(raindropId: number, tone: string = "neutral") {
  const session = await auth()

  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  const userId = session.user.id

  // summariesテーブルにレコードを作成（status: pending）
  const { withRLS } = await import("@/db/rls")
  const { summaries } = await import("@/db/schema")

  const [summary] = await withRLS(userId, async (tx) => {
    return await tx
      .insert(summaries)
      .values({
        userId,
        raindropId,
        tone: tone as "snarky" | "neutral" | "enthusiastic" | "casual",
        summary: "", // 空で作成
        model: "pending",
        status: "pending",
      })
      .returning()
  })

  console.log("[generateSummary] Created summary record:", summary.id)

  // 本文抽出イベントを送信（extractで失敗した場合はsummaryを更新）
  await inngest.send({
    name: "raindrop/item.extract.requested",
    data: {
      userId,
      raindropId,
      summaryId: summary.id, // summaryIdを渡す
      tone: tone as "snarky" | "neutral" | "enthusiastic" | "casual",
    },
  })

  // ページをリフレッシュ
  revalidatePath("/raindrops")
  revalidatePath("/summaries")

  return { summaryId: summary.id }
}

export async function deleteRaindrop(raindropId: number) {
  console.log("[deleteRaindrop] Function called for raindropId:", raindropId)

  const session = await auth()

  if (!session?.user?.id) {
    console.error("[deleteRaindrop] Unauthorized - no session")
    throw new Error("Unauthorized")
  }

  try {
    const { withRLS } = await import("@/db/rls")
    const { raindrops, summaries } = await import("@/db/schema")
    const { eq } = await import("drizzle-orm")

    console.log("[deleteRaindrop] Deleting raindrop and summaries for user:", session.user.id)

    // RLS対応のトランザクションで記事と要約を論理削除
    await withRLS(session.user.id, async (tx) => {
      // 記事を論理削除（RLSで自動的にユーザーのデータのみ対象）
      await tx
        .update(raindrops)
        .set({
          deletedAt: new Date(),
        })
        .where(eq(raindrops.id, raindropId))

      // 紐づく要約も論理削除（RLSで自動的にユーザーのデータのみ対象）
      await tx
        .update(summaries)
        .set({
          deletedAt: new Date(),
        })
        .where(eq(summaries.raindropId, raindropId))
    })

    console.log("[deleteRaindrop] Successfully deleted raindrop:", raindropId)

    // ページをリフレッシュ
    revalidatePath("/raindrops")
    revalidatePath("/summaries")
    revalidatePath("/dashboard")

    return { success: true }
  } catch (error) {
    console.error("[deleteRaindrop] Error:", error)
    throw new Error(`削除に失敗しました: ${error instanceof Error ? error.message : String(error)}`)
  }
}
