import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { withRLS } from "@/db/rls"
import { users } from "@/db/schema"
import { getRaindropCollections } from "@/lib/raindrop-api"
import { SettingsForm } from "./settings-form"

export default async function SettingsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/login")
  }

  const userId = session.user.id

  const userSettings = await withRLS(userId, async (tx) => {
    const [user] = await tx
      .select({
        monthlyBudgetUsd: users.monthlyBudgetUsd,
        defaultSummaryTone: users.defaultSummaryTone,
        notificationsEnabled: users.notificationsEnabled,
        defaultImportCollectionId: users.defaultImportCollectionId,
        hasAnthropicApiKey: users.anthropicApiKeyEncrypted,
        hasOpenaiApiKey: users.openaiApiKeyEncrypted,
        raindropAccessToken: users.raindropAccessToken,
      })
      .from(users)
      .limit(1)

    if (!user) {
      throw new Error("User not found")
    }

    return user
  })

  let collections: Array<{ id: number; name: string }> = []
  if (userSettings.raindropAccessToken) {
    try {
      const result = await getRaindropCollections(userSettings.raindropAccessToken)
      collections = result.map((item) => ({ id: item._id, name: item.title }))
    } catch (error) {
      console.error("[settings] Failed to load collections:", error)
    }
  }

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          アカウント設定
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          要約・通知・同期の既定動作を設定できます
        </p>
      </div>

      <SettingsForm
        initialBudgetUsd={Number(userSettings.monthlyBudgetUsd || 0)}
        initialTone={userSettings.defaultSummaryTone || "neutral"}
        initialNotificationsEnabled={userSettings.notificationsEnabled === 1}
        initialCollectionId={userSettings.defaultImportCollectionId || null}
        hasAnthropicApiKey={Boolean(userSettings.hasAnthropicApiKey)}
        hasOpenaiApiKey={Boolean(userSettings.hasOpenaiApiKey)}
        collections={collections}
      />
    </div>
  )
}
