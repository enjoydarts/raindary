import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"

export default function TermsPage() {
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
            <CardTitle className="text-3xl">利用規約</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-semibold">第1条（適用）</h2>
              <p className="text-gray-600">
                本規約は、Raindary（以下「本サービス」）の利用に関する条件を定めるものです。
                ユーザーは、本サービスを利用することにより、本規約に同意したものとみなされます。
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold">第2条（アカウント）</h2>
              <p className="text-gray-600">
                ユーザーは、Googleアカウントを使用して本サービスにログインします。
                アカウント情報の管理は、ユーザー自身の責任において行ってください。
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold">第3条（禁止事項）</h2>
              <p className="text-gray-600">
                ユーザーは、本サービスの利用にあたり、以下の行為を行ってはなりません：
              </p>
              <ul className="list-disc space-y-2 pl-6 text-gray-600">
                <li>法令または公序良俗に違反する行為</li>
                <li>犯罪行為に関連する行為</li>
                <li>本サービスの運営を妨害する行為</li>
                <li>他のユーザーまたは第三者の権利を侵害する行為</li>
                <li>本サービスのセキュリティを脅かす行為</li>
                <li>過度な負荷をかける行為</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold">第4条（サービスの停止・変更）</h2>
              <p className="text-gray-600">
                当方は、事前の通知なく本サービスの内容を変更、または提供を停止することがあります。
                これによりユーザーに生じた損害について、当方は一切の責任を負いません。
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold">第5条（免責事項）</h2>
              <p className="text-gray-600">
                本サービスは、AI生成による要約を提供するものであり、その正確性、完全性を保証するものではありません。
                本サービスの利用により生じた損害について、当方は一切の責任を負いません。
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold">第6条（規約の変更）</h2>
              <p className="text-gray-600">
                当方は、必要に応じて本規約を変更することができます。
                変更後の規約は、本サービス上に掲載された時点で効力を生じます。
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold">第7条（準拠法・管轄）</h2>
              <p className="text-gray-600">
                本規約の解釈にあたっては、日本法を準拠法とします。
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
