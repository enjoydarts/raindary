import { auth } from "@/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { LayoutDashboard, Newspaper, FileText, BarChart3, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Footer } from "@/components/Footer"

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
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* ナビゲーションバー */}
      <nav className="bg-white shadow-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex">
              <div className="flex flex-shrink-0 items-center">
                <Link href="/dashboard" className="flex items-center gap-2">
                  <Image src="/logo.png" alt="Raindary" width={32} height={32} />
                  <span className="text-xl font-bold text-indigo-600">Raindary</span>
                </Link>
              </div>
              <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-2 border-b-2 border-transparent px-1 pt-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
                >
                  <LayoutDashboard className="h-4 w-4" />
                  ダッシュボード
                </Link>
                <Link
                  href="/raindrops"
                  className="inline-flex items-center gap-2 border-b-2 border-transparent px-1 pt-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
                >
                  <Newspaper className="h-4 w-4" />
                  記事一覧
                </Link>
                <Link
                  href="/summaries"
                  className="inline-flex items-center gap-2 border-b-2 border-transparent px-1 pt-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
                >
                  <FileText className="h-4 w-4" />
                  要約一覧
                </Link>
                <Link
                  href="/stats"
                  className="inline-flex items-center gap-2 border-b-2 border-transparent px-1 pt-1 text-sm font-medium text-gray-500 hover:border-gray-300 hover:text-gray-700"
                >
                  <BarChart3 className="h-4 w-4" />
                  統計
                </Link>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-700">
                {user.name || user.email}
              </span>
              <form
                action={async () => {
                  "use server"
                  const { signOut } = await import("@/auth")
                  await signOut()
                }}
              >
                <Button
                  type="submit"
                  variant="ghost"
                  size="sm"
                  className="text-gray-500 hover:text-gray-700"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  ログアウト
                </Button>
              </form>
            </div>
          </div>
        </div>
      </nav>

      {/* メインコンテンツ */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8">{children}</main>

      {/* フッター */}
      <Footer />
    </div>
  )
}
