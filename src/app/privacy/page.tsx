import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <Button variant="ghost" size="sm" asChild className="mb-6">
          <Link href="/dashboard">
            <ArrowLeft className="mr-2 h-4 w-4" />
            ダッシュボードに戻る
          </Link>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-3xl">プライバシーポリシー</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-semibold">個人情報の収集</h2>
              <p className="text-gray-600">
                Raindaryは、サービス提供のために以下の情報を収集します：
              </p>
              <ul className="list-disc space-y-2 pl-6 text-gray-600">
                <li>Googleアカウントから取得するメールアドレスと名前</li>
                <li>Raindrop.ioから取得する記事情報（タイトル、URL、説明文）</li>
                <li>生成された要約データ</li>
                <li>API使用量に関する統計情報</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold">個人情報の利用目的</h2>
              <p className="text-gray-600">
                収集した個人情報は、以下の目的で利用します：
              </p>
              <ul className="list-disc space-y-2 pl-6 text-gray-600">
                <li>サービスの提供および運営</li>
                <li>ユーザーサポート</li>
                <li>サービスの改善と新機能の開発</li>
                <li>利用状況の分析</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold">個人情報の第三者提供</h2>
              <p className="text-gray-600">
                ユーザーの同意なく、第三者に個人情報を提供することはありません。
                ただし、以下の外部サービスを利用しています：
              </p>
              <ul className="list-disc space-y-2 pl-6 text-gray-600">
                <li>Anthropic Claude API（要約生成）</li>
                <li>Raindrop.io API（記事データ取得）</li>
                <li>Google OAuth（認証）</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold">データの保存期間</h2>
              <p className="text-gray-600">
                ユーザーデータは、アカウントが削除されるまで保存されます。
                アカウント削除時には、すべての個人データを削除します。
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold">お問い合わせ</h2>
              <p className="text-gray-600">
                プライバシーポリシーに関するご質問は、サポートまでお問い合わせください。
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
