"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { Search, X, Check, Loader2, FileText } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShareButton } from "./share-button"
import { togglePublic } from "./actions"
import { useRouter } from "next/navigation"

const TONE_LABELS: Record<string, { label: string; icon: string }> = {
  neutral: { label: "客観的", icon: "📋" },
  snarky: { label: "毒舌", icon: "😎" },
  enthusiastic: { label: "熱量高め", icon: "🔥" },
  casual: { label: "カジュアル", icon: "💬" },
}

interface Summary {
  id: string
  summary: string
  tone: string
  status: string
  rating: number | null
  ratingReason: string | null
  error: string | null
  isPublic: number
  createdAt: Date
  raindropId: number
  articleTitle: string | null
  articleCover: string | null
  articleLink: string | null
  articleExcerpt: string | null
}

interface SearchableListProps {
  items: Summary[]
}

export function SearchableList({ items }: SearchableListProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")

  const handleTogglePublic = async (summaryId: string) => {
    await togglePublic(summaryId)
    router.refresh()
  }

  // 検索フィルタリング
  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) {
      return items
    }

    const query = searchQuery.toLowerCase()
    return items.filter((item) => {
      // 記事タイトルで検索
      if (item.articleTitle && item.articleTitle.toLowerCase().includes(query)) {
        return true
      }

      // 要約内容で検索
      if (item.summary && item.summary.toLowerCase().includes(query)) {
        return true
      }

      // 記事本文で検索
      if (item.articleExcerpt && item.articleExcerpt.toLowerCase().includes(query)) {
        return true
      }

      // トーンで検索
      const toneLabel = TONE_LABELS[item.tone]?.label || item.tone
      if (toneLabel.toLowerCase().includes(query)) {
        return true
      }

      return false
    })
  }, [items, searchQuery])

  return (
    <div className="space-y-4">
      {/* 検索バー */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search className="h-5 w-5 text-gray-400" />
        </div>
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="記事タイトル、要約内容、トーンで検索..."
          className="pl-10 pr-10"
        />
        {searchQuery && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchQuery("")}
            className="absolute inset-y-0 right-0 h-full px-3 hover:bg-transparent"
          >
            <X className="h-5 w-5 text-gray-400 hover:text-gray-600" />
          </Button>
        )}
      </div>

      {/* 検索結果件数 */}
      {searchQuery && (
        <div className="text-sm text-gray-600">
          {filteredItems.length}件の要約が見つかりました
        </div>
      )}

      {/* 要約リスト */}
      {filteredItems.length === 0 ? (
        <Card>
          <div className="px-4 py-16 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <Search className="h-6 w-6 text-gray-400" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-2">
              検索結果が見つかりませんでした
            </h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              別のキーワードで検索してみてください。
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <div
              key={item.id}
              className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-all hover:shadow-md hover:border-gray-300"
            >
              {/* カバー画像 */}
              {item.articleCover ? (
                <div className="relative aspect-[16/9] overflow-hidden bg-gray-100">
                  <Image
                    src={item.articleCover}
                    alt=""
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                  />
                  {/* バッジ */}
                  <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
                    {/* トーンバッジ */}
                    <Badge className="bg-indigo-600/90 backdrop-blur-sm hover:bg-indigo-600/90">
                      <span className="mr-1">{TONE_LABELS[item.tone]?.icon || "📝"}</span>
                      {TONE_LABELS[item.tone]?.label || item.tone}
                    </Badge>

                    {/* ステータスバッジ */}
                    <div>
                      {item.status === "completed" && (
                        <Badge className="bg-green-600/90 backdrop-blur-sm hover:bg-green-600/90">
                          <Check className="h-3 w-3 mr-1" />
                          完了
                        </Badge>
                      )}
                      {item.status === "failed" && (
                        <Badge className="bg-red-600/90 backdrop-blur-sm hover:bg-red-600/90">
                          <X className="h-3 w-3 mr-1" />
                          失敗
                        </Badge>
                      )}
                      {item.status === "processing" && (
                        <Badge className="bg-yellow-600/90 backdrop-blur-sm hover:bg-yellow-600/90">
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          処理中
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative aspect-[16/9] bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                  <FileText className="h-12 w-12 text-gray-300" />
                  {/* バッジ */}
                  <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
                    {/* トーンバッジ */}
                    <Badge className="bg-indigo-600 hover:bg-indigo-600">
                      <span className="mr-1">{TONE_LABELS[item.tone]?.icon || "📝"}</span>
                      {TONE_LABELS[item.tone]?.label || item.tone}
                    </Badge>

                    {/* ステータスバッジ */}
                    <div>
                      {item.status === "completed" && (
                        <Badge className="bg-green-600 hover:bg-green-600">
                          <Check className="h-3 w-3 mr-1" />
                          完了
                        </Badge>
                      )}
                      {item.status === "failed" && (
                        <Badge className="bg-red-600 hover:bg-red-600">
                          <X className="h-3 w-3 mr-1" />
                          失敗
                        </Badge>
                      )}
                      {item.status === "processing" && (
                        <Badge className="bg-yellow-600 hover:bg-yellow-600">
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                          処理中
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* コンテンツ */}
              <div className="p-5">
                {/* 記事タイトル */}
                <Link href={`/summaries/${item.id}`}>
                  <h3 className="text-base font-bold text-gray-900 line-clamp-2 mb-2 hover:text-indigo-600 transition-colors cursor-pointer">
                    {item.articleTitle}
                  </h3>
                </Link>

                {/* 要約プレビュー */}
                {item.status === "completed" && item.summary && (
                  <p className="text-sm text-gray-600 line-clamp-3 mb-3">{item.summary}</p>
                )}

                {/* エラーメッセージ */}
                {item.status === "failed" && item.error && (
                  <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 mb-3">
                    <p className="text-xs text-red-800">{item.error}</p>
                  </div>
                )}

                {/* メタ情報 */}
                <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                  <span>{new Date(item.createdAt).toLocaleDateString("ja-JP")}</span>
                  {item.rating && (
                    <span className="flex items-center gap-0.5">
                      {"★".repeat(item.rating)}
                      {"☆".repeat(5 - item.rating)}
                    </span>
                  )}
                </div>

                {/* 共有ボタン */}
                {item.status === "completed" && (
                  <ShareButton
                    summaryId={item.id}
                    isPublic={item.isPublic === 1}
                    onToggle={() => handleTogglePublic(item.id)}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
