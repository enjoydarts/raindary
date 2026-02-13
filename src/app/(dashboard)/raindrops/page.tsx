import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/db"
import { raindrops } from "@/db/schema"
import { eq, desc, isNull, and } from "drizzle-orm"
import { ImportButton } from "./import-button"
import { SearchableList } from "./searchable-list"

export default async function RaindropsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect("/login")
  }

  const userId = session.user.id

  // 取り込み済み記事を取得
  const items = await db
    .select()
    .from(raindrops)
    .where(and(eq(raindrops.userId, userId), isNull(raindrops.deletedAt)))
    .orderBy(desc(raindrops.syncedAt))
    .limit(50)

  return (
    <div className="px-4 sm:px-0">
      <div className="mb-8 sm:flex sm:items-center sm:justify-between border-b border-gray-200 pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">記事一覧</h1>
          <p className="mt-2 text-sm text-gray-600">{items.length}件の記事</p>
        </div>
        <ImportButton />
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="px-4 py-16 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-2">まだ記事が取り込まれていません</h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              「今すぐ取り込む」ボタンをクリックして、Raindrop.ioから記事を取り込んでください。
            </p>
          </div>
        </div>
      ) : (
        <SearchableList items={items} />
      )}
    </div>
  )
}
