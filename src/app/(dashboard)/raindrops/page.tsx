import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/db"
import { raindrops } from "@/db/schema"
import { eq, desc, isNull, and } from "drizzle-orm"
import Image from "next/image"
import { ImportButton } from "./import-button"
import { SummaryButton } from "./summary-button"
import { DeleteButton } from "./delete-button"

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
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <ul className="divide-y divide-gray-100">
            {items.map((item) => (
              <li key={item.id} className="p-5 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-base font-semibold text-gray-900 hover:text-indigo-600 transition-colors line-clamp-2"
                    >
                      {item.title}
                    </a>
                    {item.excerpt && (
                      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-gray-600">
                        {item.excerpt}
                      </p>
                    )}
                    <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {new Date(item.createdAtRemote).toLocaleDateString("ja-JP")}
                      </span>
                      {item.tags && Array.isArray(item.tags) && (item.tags as unknown[]).length > 0 ? (
                        <span className="flex items-center gap-1" suppressHydrationWarning>
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                          {String(
                            (item.tags as unknown as string[]).slice(0, 3).join(", ")
                          )}
                        </span>
                      ) : null}
                    </div>
                    <div className="mt-4 flex items-center gap-2">
                      <SummaryButton raindropId={item.id} />
                      <DeleteButton raindropId={item.id} articleTitle={item.title} />
                    </div>
                  </div>
                  {item.cover && (
                    <Image
                      src={item.cover}
                      alt=""
                      width={96}
                      height={96}
                      className="ml-4 h-24 w-24 flex-shrink-0 rounded-lg object-cover border border-gray-200"
                    />
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
