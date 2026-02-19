"use server"

import { auth } from "@/auth"
import { withRLS } from "@/db/rls"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"
import { revalidatePath } from "next/cache"
import { encrypt } from "@/lib/crypto"

const ALLOWED_TONES = ["snarky", "neutral", "enthusiastic", "casual"] as const
type AllowedTone = (typeof ALLOWED_TONES)[number]

interface SaveAccountSettingsInput {
  monthlyBudgetUsd: string
  defaultSummaryTone: string
  notificationsEnabled: boolean
  defaultImportCollectionId: string
  anthropicApiKey: string
  openaiApiKey: string
  clearAnthropicApiKey: boolean
  clearOpenaiApiKey: boolean
}

export async function saveAccountSettings(input: SaveAccountSettingsInput) {
  const session = await auth()
  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  const userId = session.user.id
  const monthlyBudgetNumber = Number(input.monthlyBudgetUsd)
  const monthlyBudgetUsd =
    Number.isFinite(monthlyBudgetNumber) && monthlyBudgetNumber > 0
      ? monthlyBudgetNumber.toFixed(2)
      : null

  const defaultSummaryTone = ALLOWED_TONES.includes(
    input.defaultSummaryTone as AllowedTone
  )
    ? (input.defaultSummaryTone as AllowedTone)
    : "neutral"

  const collectionIdNumber = Number(input.defaultImportCollectionId)
  const defaultImportCollectionId =
    Number.isFinite(collectionIdNumber) && collectionIdNumber > 0
      ? Math.trunc(collectionIdNumber)
      : null

  const anthropicApiKey =
    input.clearAnthropicApiKey
      ? null
      : input.anthropicApiKey.trim()
        ? encrypt(input.anthropicApiKey.trim())
        : undefined

  const openaiApiKey =
    input.clearOpenaiApiKey
      ? null
      : input.openaiApiKey.trim()
        ? encrypt(input.openaiApiKey.trim())
        : undefined

  const apiKeyUpdate: Record<string, string | null | undefined> = {
    anthropicApiKeyEncrypted: anthropicApiKey,
    openaiApiKeyEncrypted: openaiApiKey,
  }

  await withRLS(userId, async (tx) => {
    await tx
      .update(users)
      .set({
        monthlyBudgetUsd,
        defaultSummaryTone,
        notificationsEnabled: input.notificationsEnabled ? 1 : 0,
        defaultImportCollectionId,
        ...apiKeyUpdate,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId))
  })

  revalidatePath("/settings")
  revalidatePath("/dashboard")
  revalidatePath("/stats")
}
