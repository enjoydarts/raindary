"use server"

import { auth } from "@/auth"
import { inngest } from "@/inngest/client"
import { revalidatePath } from "next/cache"

type Tone = "snarky" | "neutral" | "enthusiastic" | "casual"

export async function retryJob(params: {
  summaryId: string
  raindropId: number
  tone: string
}) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  const userId = session.user.id
  const safeTone: Tone =
    params.tone === "snarky" ||
    params.tone === "enthusiastic" ||
    params.tone === "casual"
      ? params.tone
      : "neutral"

  await inngest.send({
    name: "raindrop/item.extract.requested",
    data: {
      userId,
      raindropId: params.raindropId,
      summaryId: params.summaryId,
      tone: safeTone,
    },
  })

  revalidatePath("/jobs")
  revalidatePath("/summaries")
}
