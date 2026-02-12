import { auth } from "@/auth"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user) {
    redirect("/login")
  }

  const user = session.user

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              ダッシュボード
            </h1>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-700">
                <p className="font-medium">{user.name}</p>
                <p className="text-gray-500">{user.email}</p>
              </div>
              {user.image && (
                <img
                  src={user.image}
                  alt={user.name || "User"}
                  className="h-10 w-10 rounded-full"
                />
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-xl font-semibold text-gray-900">
            ようこそ、{user.name}さん！
          </h2>
          <p className="text-gray-600">Raindrop.ioとの連携が完了しました。</p>
          <div className="mt-6">
            <p className="text-sm text-gray-500">User ID: {user.id}</p>
          </div>
        </div>

        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="mb-2 text-lg font-semibold text-gray-900">記事の同期</h3>
            <p className="text-sm text-gray-600">Raindrop.ioから記事を取り込みます</p>
            <button className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              同期を開始
            </button>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="mb-2 text-lg font-semibold text-gray-900">要約の生成</h3>
            <p className="text-sm text-gray-600">AI要約を生成します</p>
            <button className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              要約を生成
            </button>
          </div>

          <div className="rounded-lg bg-white p-6 shadow">
            <h3 className="mb-2 text-lg font-semibold text-gray-900">使用状況</h3>
            <p className="text-sm text-gray-600">API使用状況を確認します</p>
            <button className="mt-4 rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700">
              詳細を見る
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
