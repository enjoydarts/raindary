import Link from "next/link"

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams
  const error = params.error

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white p-10 shadow-lg">
        <div className="text-center">
          <h1 className="mb-2 text-4xl font-bold text-gray-900">Raindary</h1>
          <p className="text-gray-600">自分語り要約ツール</p>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <div className="flex">
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  ログインエラー
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{typeof error === 'string' ? decodeURIComponent(error) : 'ログインに失敗しました'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 space-y-6">
          <Link
            href="/api/auth/signin/raindrop"
            className="flex w-full justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Raindrop.ioでログイン
          </Link>

          <div className="text-center text-xs text-gray-500">
            <p>
              ログインすると、Raindrop.ioの記事を自動で取り込み、
              <br />
              AI要約を生成できます。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
