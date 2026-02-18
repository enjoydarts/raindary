"use client"

import { useState, useMemo } from "react"
import Image from "next/image"
import { Search, X, Calendar, Tag, Newspaper } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SummaryButton } from "./summary-button"
import { DeleteButton } from "./delete-button"
import { CollectionFilter } from "./collection-filter"

interface Raindrop {
  id: number
  title: string
  link: string
  excerpt: string | null
  cover: string | null
  tags: unknown
  collectionId: number | null
  createdAtRemote: Date
}

interface SearchableListProps {
  items: Raindrop[]
  collectionMap?: Map<number, string>
}

export function SearchableList({ items, collectionMap = new Map() }: SearchableListProps) {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCollection, setSelectedCollection] = useState<number | null>(null)

  // コレクション一覧を生成
  const collections = useMemo(() => {
    const collectionCountMap = new Map<number, number>()

    items.forEach((item) => {
      if (item.collectionId !== null) {
        const count = collectionCountMap.get(item.collectionId) || 0
        collectionCountMap.set(item.collectionId, count + 1)
      }
    })

    return Array.from(collectionCountMap.entries())
      .map(([id, count]) => ({
        id,
        name: collectionMap.get(id) || `Collection ${id}`,
        count,
      }))
      .sort((a, b) => b.count - a.count)
  }, [items, collectionMap])

  // 検索・コレクションフィルタリング
  const filteredItems = useMemo(() => {
    let result = items

    // コレクションフィルタ
    if (selectedCollection !== null) {
      result = result.filter((item) => item.collectionId === selectedCollection)
    }

    // 検索フィルタ
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      result = result.filter((item) => {
        // タイトルで検索
        if (item.title.toLowerCase().includes(query)) {
          return true
        }

        // 本文で検索
        if (item.excerpt && item.excerpt.toLowerCase().includes(query)) {
          return true
        }

        // タグで検索
        if (item.tags && Array.isArray(item.tags)) {
          const tags = item.tags as string[]
          if (tags.some((tag) => tag.toLowerCase().includes(query))) {
            return true
          }
        }

        return false
      })
    }

    return result
  }, [items, searchQuery, selectedCollection])

  return (
    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
      {/* サイドバー（コレクションフィルタ） */}
      {collections.length > 0 && (
        <div className="lg:col-span-1">
          <CollectionFilter
            collections={collections}
            onFilterChange={setSelectedCollection}
          />
        </div>
      )}

      {/* メインコンテンツ */}
      <div className={`space-y-4 ${collections.length > 0 ? "lg:col-span-3" : "lg:col-span-4"}`}>
        {/* 検索バー */}
        <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
          <Search className="h-5 w-5 text-slate-400" />
        </div>
        <Input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="タイトル、本文、タグで検索..."
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

      {/* 検索結果件数 */}
      {searchQuery && (
        <div className="text-sm text-slate-600">
          {filteredItems.length}件の記事が見つかりました
        </div>
      )}

      {/* 記事リスト */}
      {filteredItems.length === 0 ? (
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
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => {
            const formatDate = (date: Date) => {
              return new Date(date).toLocaleDateString("ja-JP", {
                year: "numeric",
                month: "short",
                day: "numeric",
                timeZone: "Asia/Tokyo"
              })
            }

            return (
              <div
                key={item.id}
                className="group overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm card-hover"
              >
                {/* カバー画像（上部・大きく） */}
                {item.cover ? (
                  <div className="relative aspect-[16/9] overflow-hidden bg-slate-100">
                    <Image
                      src={item.cover}
                      alt=""
                      fill
                      className="object-cover image-hover-zoom"
                    />
                    {/* 日付バッジ（画像上） */}
                    <div className="absolute top-3 right-3">
                      <Badge className="bg-white/90 backdrop-blur-sm text-slate-700 hover:bg-white/90">
                        <Calendar className="h-3 w-3 mr-1" />
                        {formatDate(item.createdAtRemote)}
                      </Badge>
                    </div>
                  </div>
                ) : (
                  <div className="aspect-[16/9] bg-slate-100 flex items-center justify-center">
                    <Newspaper className="h-12 w-12 text-slate-300" />
                  </div>
                )}

                {/* コンテンツエリア */}
                <div className="p-5">
                  <h3 className="text-lg font-semibold text-slate-900 line-clamp-2 mb-2 hover:text-indigo-600 transition-colors">
                    <a href={item.link} target="_blank" rel="noopener noreferrer">
                      {item.title}
                    </a>
                  </h3>

                  {item.excerpt && (
                    <p className="text-sm text-slate-600 line-clamp-3 mb-4">
                      {item.excerpt}
                    </p>
                  )}

                  {/* タグ */}
                  {item.tags && Array.isArray(item.tags) && (item.tags as string[]).length > 0 ? (
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {(item.tags as string[]).slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  ) : null}

                  {/* アクションボタン */}
                  <div className="flex items-center gap-2">
                    <SummaryButton raindropId={item.id} />
                    <DeleteButton raindropId={item.id} articleTitle={item.title} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      </div>
    </div>
  )
}
