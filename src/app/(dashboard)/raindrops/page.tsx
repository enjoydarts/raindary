import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { withRLS } from "@/db/rls"
import { raindrops, users } from "@/db/schema"
import { eq, desc, isNull, and } from "drizzle-orm"
import { Newspaper } from "lucide-react"
import { Card } from "@/components/ui/card"
import { ImportButton } from "./import-button"
import { SearchableList } from "./searchable-list"
import { RefreshButton } from "@/components/RefreshButton"
import { getRaindropCollections, createCollectionMap } from "@/lib/raindrop-api"

export default async function RaindropsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/login")
  }

  const userId = session.user.id

  // RLS対応: セッション変数を設定してクエリを実行
  const { items, user } = await withRLS(userId, async (tx) => {
    // 取り込み済み記事を取得（RLSで自動的にユーザーのデータのみ取得）
    const items = await tx
      .select()
      .from(raindrops)
      .where(isNull(raindrops.deletedAt))
      .orderBy(desc(raindrops.syncedAt))
      .limit(50)

    // ユーザーのRaindropアクセストークンを取得（RLSで自動フィルタリング）
    const [user] = await tx
      .select({ raindropAccessToken: users.raindropAccessToken })
      .from(users)
      .limit(1)

    return { items, user }
  })

  // コレクション名を取得（APIから）
  let collectionMap = new Map<number, string>()
  if (user?.raindropAccessToken) {
    try {
      const collections = await getRaindropCollections(user.raindropAccessToken)
      collectionMap = createCollectionMap(collections)
    } catch (error) {
      console.error("[RaindropsPage] Failed to fetch collections:", error)
      // エラーが発生してもページは表示（コレクション名なしで）
    }
  }

  return (
    <div className="px-4 sm:px-0">
      <div className="mb-8 sm:flex items-center sm:justify-between border-b border-slate-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">記事一覧</h1>
          <p className="mt-2 text-sm text-slate-600">{items.length}件の記事</p>
        </div>
        <div className="mt-4 sm:mt-0 sm:ml-4 flex items-center gap-2 relative">
          <RefreshButton />
          <ImportButton />
        </div>
      </div>

      {items.length === 0 ? (
        <Card>
          <div className="px-4 py-16 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <Newspaper className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-2">まだ記事が取り込まれていません</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              「今すぐ取り込む」ボタンをクリックして、Raindrop.ioから記事を取り込んでください。
            </p>
          </div>
        </Card>
      ) : (
        <SearchableList items={items} collectionMap={collectionMap} />
      )}
    </div>
  )
}
