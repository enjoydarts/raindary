import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await auth()

  // ミドルウェアで認証済みなので、ここでは通常 session が存在する
  // 念のため確認
  if (!session?.user) {
    redirect("/login")
  }

  const user = session.user

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ナビゲーションバー */}
      <nav className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex">
              <div className="flex flex-shrink-0 items-center">
                <Link href="/dashboard" className="text-xl font-bold text-indigo-600">
                  Raindary
                </Link>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
                >
                  ダッシュボード
                </Link>
                <Link
                  href="/dashboard/raindrops"
                  className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
                >
                  記事一覧
                </Link>
                <Link
                  href="/dashboard/summaries"
                  className="inline-flex items-center border-b-2 border-transparent px-1 pt-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
                >
                  要約一覧
                </Link>
              </div>
            </div>
            <div className="flex items-center">
              <span className="mr-4 text-sm text-gray-700">
                {user.name || user.email}
              </span>
              <form
                action={async () => {
                  "use server"
                  const { signOut } = await import("@/auth")
                  await signOut()
                }}
              >
                <button
                  type="submit"
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  ログアウト
                </button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      {/* メインコンテンツ */}
      <main className="mx-auto max-w-7xl py-6 sm:px-6 lg:px-8">{children}</main>
    </div>
  )
}
