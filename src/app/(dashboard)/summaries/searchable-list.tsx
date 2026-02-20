"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  Search,
  X,
  Check,
  Loader2,
  FileText,
  ClipboardList,
  Zap,
  Flame,
  MessageCircle,
  Clock,
  Tag,
  Filter,
} from "lucide-react"
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

const STATUS_META: Record<
  string,
  { label: string; className: string; Icon: LucideIcon }
> = {
  completed: {
    label: "完了",
    className:
      "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    Icon: Check,
  },
  failed: {
    label: "失敗",
    className:
      "bg-rose-100 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800",
    Icon: X,
  },
  processing: {
    label: "処理中",
    className:
      "bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    Icon: Loader2,
  },
  pending: {
    label: "待機中",
    className:
      "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700",
    Icon: Clock,
  },
}

interface Summary {
  id: string
  summary: string
  tone: string
  theme: string | null
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
  articleTags: unknown
}

interface SearchableListProps {
  items: Summary[]
}

export function SearchableList({ items }: SearchableListProps) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedTone, setSelectedTone] = useState<string | null>(null)
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null)
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null)
  const [selectedTag, setSelectedTag] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 12

  useEffect(() => {
    const hasInFlight = items.some(
      (item) => item.status === "processing" || item.status === "pending"
    )
    if (!hasInFlight) return

    const timer = setInterval(() => {
      router.refresh()
    }, 15000)

    return () => clearInterval(timer)
  }, [items, router])

  const handleTogglePublic = async (summaryId: string) => {
    await togglePublic(summaryId)
    router.refresh()
  }

  const availableThemes = useMemo(() => {
    const themes = new Set<string>()
    items.forEach((item) => {
      if (item.theme) themes.add(item.theme)
    })
    return Array.from(themes).sort()
  }, [items])

  const availableTags = useMemo(() => {
    const tagCountMap = new Map<string, number>()
    items.forEach((item) => {
      if (item.articleTags && Array.isArray(item.articleTags)) {
        ;(item.articleTags as string[]).forEach((tag) => {
          tagCountMap.set(tag, (tagCountMap.get(tag) || 0) + 1)
        })
      }
    })
    return Array.from(tagCountMap.entries()).sort((a, b) => b[1] - a[1])
  }, [items])

  const filteredItems = useMemo(() => {
    let result = items

    if (selectedTone) {
      result = result.filter((item) => item.tone === selectedTone)
    }

    if (selectedTheme) {
      result = result.filter((item) => item.theme === selectedTheme)
    }

    if (selectedTag) {
      result = result.filter((item) => {
        if (!item.articleTags || !Array.isArray(item.articleTags)) return false
        return (item.articleTags as string[]).includes(selectedTag)
      })
    }

    if (selectedStatus) {
      result = result.filter((item) => item.status === selectedStatus)
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter((item) => {
        if (item.articleTitle && item.articleTitle.toLowerCase().includes(query)) return true
        if (item.summary && item.summary.toLowerCase().includes(query)) return true
        if (item.articleExcerpt && item.articleExcerpt.toLowerCase().includes(query)) return true
        const toneLabel = TONE_LABELS[item.tone]?.label || item.tone
        return toneLabel.toLowerCase().includes(query)
      })
    }

    return result
  }, [items, searchQuery, selectedTone, selectedTheme, selectedStatus, selectedTag])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, selectedTone, selectedTheme, selectedStatus, selectedTag])

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage)
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredItems.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredItems, currentPage])

  const hasActiveFilters =
    Boolean(searchQuery.trim()) ||
    Boolean(selectedTone) ||
    Boolean(selectedTheme) ||
    Boolean(selectedStatus) ||
    Boolean(selectedTag)

  const clearFilters = () => {
    setSearchQuery("")
    setSelectedTone(null)
    setSelectedTheme(null)
    setSelectedStatus(null)
    setSelectedTag(null)
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-5 w-5 text-slate-400" />
            </div>
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="記事タイトル・要約内容で検索"
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
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearFilters}
              disabled={!hasActiveFilters}
            >
              フィルター解除
            </Button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">トーン</span>
            <select
              value={selectedTone ?? ""}
              onChange={(e) => setSelectedTone(e.target.value || null)}
              className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
            >
              <option value="">すべて</option>
              {Object.entries(TONE_LABELS).map(([value, { label }]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-600 dark:text-slate-400">ステータス</span>
            <select
              value={selectedStatus ?? ""}
              onChange={(e) => setSelectedStatus(e.target.value || null)}
              className="w-full rounded-md border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 px-3 py-2 text-sm text-slate-900 dark:text-slate-100"
            >
              <option value="">すべて</option>
              {Object.entries(STATUS_META).map(([value, meta]) => (
                <option key={value} value={value}>
                  {meta.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {availableThemes.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-400">テーマ</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedTheme === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedTheme(null)}
                className={selectedTheme === null ? "bg-purple-600 hover:bg-purple-700" : ""}
              >
                すべて
              </Button>
              {availableThemes.slice(0, 16).map((theme) => (
                <Button
                  key={theme}
                  variant={selectedTheme === theme ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTheme(theme)}
                  className={selectedTheme === theme ? "bg-purple-600 hover:bg-purple-700" : ""}
                >
                  {theme}
                </Button>
              ))}
            </div>
          </div>
        )}

        {availableTags.length > 0 && (
          <div className="mt-4">
            <p className="mb-2 text-xs font-medium text-slate-600 dark:text-slate-400">タグ</p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={selectedTag === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedTag(null)}
                className={selectedTag === null ? "bg-teal-600 hover:bg-teal-700" : ""}
              >
                すべて
              </Button>
              {availableTags.slice(0, 20).map(([tag, count]) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                    selectedTag === tag
                      ? "border-teal-600 bg-teal-600 text-white"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:border-teal-300"
                  }`}
                >
                  <Tag className="h-3 w-3" />
                  {tag}
                  <span className="opacity-70">({count})</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
        <span>{filteredItems.length}件の要約</span>
        {hasActiveFilters ? <span>フィルター適用中</span> : <span>全件表示</span>}
      </div>

      {paginatedItems.length === 0 ? (
        <Card>
          <div className="px-4 py-16 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <Search className="h-6 w-6 text-slate-400" />
            </div>
            <h3 className="mb-2 text-base font-semibold text-slate-900 dark:text-slate-100">
              条件に一致する要約がありません
            </h3>
            <p className="mx-auto max-w-sm text-sm text-slate-500">検索条件やフィルターを変更してみてください。</p>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedItems.map((item) => {
              const toneMeta = TONE_LABELS[item.tone]
              const ToneIcon = toneMeta?.Icon ?? FileText
              const statusMeta = STATUS_META[item.status] || STATUS_META.pending
              const StatusIcon = statusMeta.Icon

              return (
                <article
                  key={item.id}
                  className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-sm"
                >
                  <div className="relative aspect-[16/9] bg-slate-100 dark:bg-slate-800">
                    {item.articleCover ? (
                      <Image src={item.articleCover} alt="" fill className="object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <FileText className="h-12 w-12 text-slate-300" />
                      </div>
                    )}
                  </div>

                  <div className="space-y-3 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary" className="inline-flex items-center gap-1">
                        <ToneIcon className="h-3 w-3" />
                        {toneMeta?.label || item.tone}
                      </Badge>
                      <Badge variant="outline" className={`inline-flex items-center gap-1 ${statusMeta.className}`}>
                        <StatusIcon className={`h-3 w-3 ${item.status === "processing" ? "animate-spin" : ""}`} />
                        {statusMeta.label}
                      </Badge>
                      {item.theme ? (
                        <Badge variant="outline" className="bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800">
                          {item.theme}
                        </Badge>
                      ) : null}
                    </div>

                    <Link href={`/summaries/${item.id}`}>
                      <h3 className="line-clamp-2 text-base font-semibold text-slate-900 dark:text-slate-100 hover:text-indigo-600 transition-colors">
                        {item.articleTitle || "無題の記事"}
                      </h3>
                    </Link>

                    {item.status === "completed" && item.summary ? (
                      <p className="line-clamp-3 text-sm text-slate-600 dark:text-slate-400">{item.summary}</p>
                    ) : null}

                    {item.status === "failed" && item.error ? (
                      <div className="rounded-md border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/30 px-3 py-2">
                        <p className="line-clamp-2 text-xs text-rose-700 dark:text-rose-300">{item.error}</p>
                      </div>
                    ) : null}

                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                      <span>
                        {new Date(item.createdAt).toLocaleDateString("ja-JP", {
                          timeZone: "Asia/Tokyo",
                        })}
                      </span>
                      {item.rating ? <span>{"★".repeat(item.rating)}{"☆".repeat(5 - item.rating)}</span> : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 dark:border-slate-800 pt-3">
                      {item.status === "completed" ? (
                        <ShareButton
                          summaryId={item.id}
                          isPublic={item.isPublic === 1}
                          onToggle={() => handleTogglePublic(item.id)}
                        />
                      ) : null}
                      {item.status === "failed" ? (
                        <RetryButton summaryId={item.id} raindropId={item.raindropId} tone={item.tone} />
                      ) : null}
                      {(item.status === "completed" || item.status === "failed") ? (
                        <DeleteButton
                          summaryId={item.id}
                          onDelete={async () => {
                            router.refresh()
                            await new Promise((resolve) => setTimeout(resolve, 100))
                          }}
                        />
                      ) : null}
                    </div>
                  </div>
                </article>
              )
            })}
          </div>

          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
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
                        className={currentPage === page ? "bg-indigo-600 hover:bg-indigo-700" : ""}
                      >
                        {page}
                      </Button>
                    )
                  }
                  if (page === currentPage - 3 || page === currentPage + 3) {
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
