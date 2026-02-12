import { auth } from "@/auth"
import { redirect } from "next/navigation"
import { db } from "@/db"
import { raindrops } from "@/db/schema"
import { eq, desc, isNull, and } from "drizzle-orm"
import Image from "next/image"

async function triggerImport() {
  "use server"

  const res = await fetch(`${process.env.NEXTAUTH_URL}/api/import/trigger`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({}),
  })

  if (!res.ok) {
    throw new Error("Import failed")
  }
}

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
      <div className="mb-8 sm:flex sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-gray-900">記事一覧</h1>
        <form
          action={async () => {
            "use server"
            await triggerImport()
          }}
        >
          <button
            type="submit"
            className="mt-4 inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:mt-0"
          >
            今すぐ取り込む
          </button>
        </form>
      </div>

      {items.length === 0 ? (
        <div className="rounded-lg bg-white shadow">
          <div className="px-4 py-12 text-center">
            <p className="mb-4 text-gray-500">まだ記事が取り込まれていません</p>
            <p className="text-sm text-gray-400">
              「今すぐ取り込む」ボタンをクリックして、Raindrop.ioから記事を取り込んでください。
            </p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg bg-white shadow">
          <ul className="divide-y divide-gray-200">
            {items.map((item) => (
              <li key={item.id} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <a
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-indigo-600 hover:text-indigo-500"
                    >
                      {item.title}
                    </a>
                    {item.excerpt && (
                      <p className="mt-1 line-clamp-2 text-sm text-gray-500">
                        {item.excerpt}
                      </p>
                    )}
                    <div className="mt-2 flex items-center space-x-4 text-xs text-gray-400">
                      <span>
                        {new Date(item.createdAtRemote).toLocaleDateString("ja-JP")}
                      </span>
                      {item.tags &&
                        Array.isArray(item.tags) &&
                        (item.tags as unknown[]).length > 0 ? (
                          <span suppressHydrationWarning>
                            {String(
                              (item.tags as unknown as string[]).slice(0, 3).join(", ")
                            )}
                          </span>
                        ) : null}
                    </div>
                  </div>
                  {item.cover && (
                    <Image
                      src={item.cover}
                      alt=""
                      width={64}
                      height={64}
                      className="ml-4 h-16 w-16 flex-shrink-0 rounded object-cover"
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
