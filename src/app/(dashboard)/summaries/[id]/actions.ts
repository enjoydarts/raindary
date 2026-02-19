"use server"

import { auth } from "@/auth"
import { withRLS } from "@/db/rls"
import { summaries } from "@/db/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"

/**
 * 要約のテーマを更新
 */
export async function updateTheme(summaryId: string, theme: string | null) {
  const session = await auth()

  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  const userId = session.user.id

  await withRLS(userId, async (tx) => {
    await tx
      .update(summaries)
      .set({ theme, updatedAt: new Date() })
      .where(eq(summaries.id, summaryId))
  })

  revalidatePath(`/summaries/${summaryId}`)
  revalidatePath("/summaries")
}
