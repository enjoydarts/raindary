"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"
import { Search, X, Check, Loader2, FileText, ClipboardList, Zap, Flame, MessageCircle, Clock } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ShareButton } from "./share-button"
import { RetryButton } from "./retry-button"
import { DeleteButton } from "./delete-button"
import { togglePublic } from "./actions"
import { useRouter } from "next/navigation"

const TONE_LABELS: Record<string, { label: string; Icon: LucideIcon }> = {
  neutral: { label: "客観的", Icon: ClipboardList },
  snarky: { label: "毒舌", Icon: Zap },
  enthusiastic: { label: "熱量高め", Icon: Flame },
  casual: { label: "カジュアル", Icon: MessageCircle },
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
  const [selectedTone, setSelectedTone] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 12

  const handleTogglePublic = async (summaryId: string) => {
    await togglePublic(summaryId)
    router.refresh()
  }

  // 検索とフィルタリング
  const filteredItems = useMemo(() => {
    let result = items

    // トーンフィルター
    if (selectedTone) {
      result = result.filter((item) => item.tone === selectedTone)
    }

    // ステータスフィルター
    if (selectedStatus) {
      result = result.filter((item) => item.status === selectedStatus)
    }

    // 検索フィルター
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter((item) => {
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
    }

    return result
  }, [items, searchQuery, selectedTone, selectedStatus])

  // ページネーション
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage)
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredItems.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredItems, currentPage, itemsPerPage])

  // フィルター変更時にページを1にリセット
  useMemo(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedTone, selectedStatus])

  return (
    <div className="space-y-4">
      {/* 検索バー */}
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search className="h-5 w-5 text-slate-400" />
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
            <X className="h-5 w-5 text-slate-400 hover:text-slate-600" />
          </Button>
        )}
      </div>

      {/* フィルター */}
      <div className="flex flex-wrap gap-2">
        {/* トーンフィルター */}
        <div className="flex gap-2">
          <Button
            variant={selectedTone === null ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedTone(null)}
            className={selectedTone === null ? "bg-indigo-600 hover:bg-indigo-700" : ""}
          >
            すべて
          </Button>
          {Object.entries(TONE_LABELS).map(([value, { label, Icon }]) => (
            <Button
              key={value}
              variant={selectedTone === value ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedTone(value)}
              className={selectedTone === value ? "bg-indigo-600 hover:bg-indigo-700" : ""}
            >
              <Icon className="h-3.5 w-3.5 mr-1.5" />
              {label}
            </Button>
          ))}
        </div>

        {/* ステータスフィルター */}
        <div className="flex gap-2 ml-auto">
          <Button
            variant={selectedStatus === "completed" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedStatus(selectedStatus === "completed" ? null : "completed")}
            className={selectedStatus === "completed" ? "bg-green-600 hover:bg-green-700" : ""}
          >
            <Check className="h-3.5 w-3.5 mr-1.5" />
            完了のみ
          </Button>
          <Button
            variant={selectedStatus === "processing" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedStatus(selectedStatus === "processing" ? null : "processing")}
            className={selectedStatus === "processing" ? "bg-yellow-600 hover:bg-yellow-700" : ""}
          >
            <Loader2 className="h-3.5 w-3.5 mr-1.5" />
            処理中のみ
          </Button>
          <Button
            variant={selectedStatus === "failed" ? "default" : "outline"}
            size="sm"
            onClick={() => setSelectedStatus(selectedStatus === "failed" ? null : "failed")}
            className={selectedStatus === "failed" ? "bg-red-600 hover:bg-red-700" : ""}
          >
            <X className="h-3.5 w-3.5 mr-1.5" />
            失敗のみ
          </Button>
        </div>
      </div>

      {/* 検索・フィルター結果件数 */}
      {(searchQuery || selectedTone || selectedStatus) && (
        <div className="text-sm text-slate-600">
          {filteredItems.length}件の要約が見つかりました
        </div>
      )}

      {/* 要約リスト */}
      {paginatedItems.length === 0 ? (
        <Card>
          <div className="px-4 py-16 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <Search className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-2">
              検索結果が見つかりませんでした
            </h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              別のキーワードで検索してみてください。
            </p>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedItems.map((item) => (
            <div
              key={item.id}
              className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm card-hover"
            >
              {/* カバー画像 */}
              {item.articleCover ? (
                <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
                  <Image
                    src={item.articleCover}
                    alt=""
                    fill
                    className="object-cover image-hover-zoom"
                  />
                  {/* バッジ */}
                  <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
                    {/* トーンバッジ */}
                    <Badge className="bg-indigo-600/90 backdrop-blur-sm hover:bg-indigo-600/90">
                      {(() => {
                        const ToneIcon = TONE_LABELS[item.tone]?.Icon || FileText
                        return <ToneIcon className="h-3 w-3 mr-1" />
                      })()}
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
                      {item.status === "pending" && (
                        <Badge className="bg-slate-600/90 backdrop-blur-sm hover:bg-slate-600/90">
                          <Clock className="h-3 w-3 mr-1" />
                          待機中
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative aspect-[16/9] bg-slate-100 flex items-center justify-center">
                  <FileText className="h-12 w-12 text-slate-300" />
                  {/* バッジ */}
                  <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
                    {/* トーンバッジ */}
                    <Badge className="bg-indigo-600 hover:bg-indigo-600">
                      {(() => {
                        const ToneIcon = TONE_LABELS[item.tone]?.Icon || FileText
                        return <ToneIcon className="h-3 w-3 mr-1" />
                      })()}
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
                      {item.status === "pending" && (
                        <Badge className="bg-slate-600 hover:bg-slate-600">
                          <Clock className="h-3 w-3 mr-1" />
                          待機中
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
                  <h3 className="text-base font-bold text-slate-900 line-clamp-2 mb-2 hover:text-indigo-600 transition-colors cursor-pointer">
                    {item.articleTitle}
                  </h3>
                </Link>

                {/* 要約プレビュー */}
                {item.status === "completed" && item.summary && (
                  <p className="text-sm text-slate-600 line-clamp-3 mb-3">{item.summary}</p>
                )}

                {/* エラーメッセージ */}
                {item.status === "failed" && item.error && (
                  <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 mb-3">
                    <p className="text-xs text-red-800">{item.error}</p>
                  </div>
                )}

                {/* メタ情報 */}
                <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                  <span>{new Date(item.createdAt).toLocaleDateString("ja-JP", { timeZone: "Asia/Tokyo" })}</span>
                  {item.rating && (
                    <span className="flex items-center gap-0.5">
                      {"★".repeat(item.rating)}
                      {"☆".repeat(5 - item.rating)}
                    </span>
                  )}
                </div>

                {/* アクションボタン */}
                <div className="flex gap-2">
                  {item.status === "completed" && (
                    <ShareButton
                      summaryId={item.id}
                      isPublic={item.isPublic === 1}
                      onToggle={() => handleTogglePublic(item.id)}
                    />
                  )}
                  {item.status === "failed" && (
                    <RetryButton
                      summaryId={item.id}
                      raindropId={item.raindropId}
                      tone={item.tone}
                    />
                  )}
                  {(item.status === "completed" || item.status === "failed") && (
                    <DeleteButton
                      summaryId={item.id}
                      onDelete={async () => {
                        router.refresh()
                        // リフレッシュを待つ
                        await new Promise(resolve => setTimeout(resolve, 100))
                      }}
                    />
                  )}
                </div>
              </div>
            </div>
          ))}
          </div>

          {/* ページネーション */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                前へ
              </Button>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                  // 最初、最後、現在ページの前後2ページのみ表示
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 2 && page <= currentPage + 2)
                  ) {
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className={
                          currentPage === page ? "bg-indigo-600 hover:bg-indigo-700" : ""
                        }
                      >
                        {page}
                      </Button>
                    )
                  } else if (page === currentPage - 3 || page === currentPage + 3) {
                    return (
                      <span key={page} className="px-2 text-slate-400">
                        ...
                      </span>
                    )
                  }
                  return null
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                次へ
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
