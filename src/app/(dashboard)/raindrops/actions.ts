"use server"

import { auth } from "@/auth"
import { inngest } from "@/inngest/client"
import { revalidatePath } from "next/cache"

export async function triggerImport() {
  const session = await auth()

  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  // Inngestイベントを直接送信
  await inngest.send({
    name: "raindrop/import.requested",
    data: {
      userId: session.user.id,
    },
  })

  // ページをリフレッシュ
  revalidatePath("/dashboard/raindrops")
}

export async function generateSummary(raindropId: number, tone: string = "neutral") {
  const session = await auth()

  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  // 本文抽出イベントを送信（まだ抽出されていない場合）
  await inngest.send({
    name: "raindrop/item.extract.requested",
    data: {
      userId: session.user.id,
      raindropId,
    },
  })

  // 要約生成イベントを送信
  await inngest.send({
    name: "raindrop/item.summarize.requested",
    data: {
      userId: session.user.id,
      raindropId,
      tone: tone as "snarky" | "neutral" | "enthusiastic" | "casual",
    },
  })

  // ページをリフレッシュ
  revalidatePath("/dashboard/raindrops")
  revalidatePath("/dashboard/summaries")
}
