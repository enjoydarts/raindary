import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"

export default function AboutPage() {
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
            <CardTitle className="text-3xl">Raindaryについて</CardTitle>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none space-y-6">
            <section>
              <h2 className="text-2xl font-semibold">Raindaryとは</h2>
              <p className="text-gray-600">
                Raindaryは、Raindrop.ioに保存した記事を自動的にAI要約するツールです。
                読みたい記事が溜まっている方、効率的に情報をキャッチアップしたい方に最適なサービスです。
              </p>
            </section>

            <section>
              <h2 className="text-2xl font-semibold">主な機能</h2>
              <ul className="list-disc space-y-2 pl-6 text-gray-600">
                <li>Raindrop.ioとの連携による記事の自動取り込み</li>
                <li>Claude AIによる高品質な要約生成</li>
                <li>複数のトーン（カジュアル、フォーマル、技術的）に対応</li>
                <li>要約の共有機能</li>
                <li>API使用量の統計表示</li>
              </ul>
            </section>

            <section>
              <h2 className="text-2xl font-semibold">開発について</h2>
              <p className="text-gray-600">
                Raindaryは、Next.js、TypeScript、そしてAnthropic Claude APIを使用して開発されています。
                オープンソースプロジェクトとして、継続的に改善を続けています。
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
