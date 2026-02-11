import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { db } from "@/db"
import { summaries } from "@/db/schema"
import { eq, desc } from "drizzle-orm"
import Link from "next/link"

export default async function SummariesPage() {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get("raindrop-session")

  if (!sessionCookie) {
    redirect("/login")
  }

  let session
  try {
    session = JSON.parse(sessionCookie.value)
  } catch {
    redirect("/login")
  }

  const userId = session.userId

  // 生成済み要約を取得
  const items = await db
    .select()
    .from(summaries)
    .where(eq(summaries.userId, userId))
    .orderBy(desc(summaries.createdAt))
    .limit(100)

  return (
    <div className="px-4 sm:px-0">
      <h1 className="mb-8 text-3xl font-bold text-gray-900">要約一覧</h1>

      {items.length === 0 ? (
        <div className="rounded-lg bg-white shadow">
          <div className="px-4 py-12 text-center">
            <p className="mb-4 text-gray-500">まだ要約が生成されていません</p>
            <Link
              href="/dashboard/raindrops"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              記事を取り込む →
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <Link
              key={item.id}
              href={`/dashboard/summaries/${item.id}`}
              className="rounded-lg bg-white p-6 shadow transition-shadow hover:shadow-md"
            >
              <div className="mb-4 flex items-start justify-between">
                <span className="inline-flex items-center rounded-full bg-indigo-100 px-2.5 py-0.5 text-xs font-medium capitalize text-indigo-800">
                  {item.tone}
                </span>
                {item.rating && (
                  <span className="text-sm text-gray-500">⭐ {item.rating}/5</span>
                )}
              </div>

              <p className="mb-4 line-clamp-4 text-sm text-gray-900">{item.summary}</p>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>{new Date(item.createdAt).toLocaleDateString("ja-JP")}</span>
                <span
                  className={`rounded px-2 py-1 ${
                    item.status === "completed"
                      ? "bg-green-100 text-green-800"
                      : item.status === "failed"
                        ? "bg-red-100 text-red-800"
                        : "bg-yellow-100 text-yellow-800"
                  }`}
                >
                  {item.status}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
