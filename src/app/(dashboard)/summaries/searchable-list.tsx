"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import Image from "next/image"

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
  const [searchQuery, setSearchQuery] = useState("")

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
          <svg
            className="h-5 w-5 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="記事タイトル、要約内容、トーンで検索..."
          className="block w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-3 text-sm placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400 hover:text-gray-600"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
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
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="px-4 py-16 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <svg
                className="h-6 w-6 text-gray-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-2">
              検索結果が見つかりませんでした
            </h3>
            <p className="text-sm text-gray-500 max-w-sm mx-auto">
              別のキーワードで検索してみてください。
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => (
            <Link
              key={item.id}
              href={`/summaries/${item.id}`}
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
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-600/90 backdrop-blur-sm px-2.5 py-1 text-xs font-semibold text-white">
                      <span>{TONE_LABELS[item.tone]?.icon || "📝"}</span>
                      {TONE_LABELS[item.tone]?.label || item.tone}
                    </span>

                    {/* ステータスバッジ */}
                    <div>
                      {item.status === "completed" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-600/90 backdrop-blur-sm px-2.5 py-1 text-xs font-semibold text-white">
                          <svg
                            className="h-3 w-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          完了
                        </span>
                      )}
                      {item.status === "failed" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-600/90 backdrop-blur-sm px-2.5 py-1 text-xs font-semibold text-white">
                          <svg
                            className="h-3 w-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                          失敗
                        </span>
                      )}
                      {item.status === "processing" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-600/90 backdrop-blur-sm px-2.5 py-1 text-xs font-semibold text-white">
                          <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          処理中
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="relative aspect-[16/9] bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                  <svg
                    className="h-12 w-12 text-gray-300"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z"
                    />
                  </svg>
                  {/* バッジ */}
                  <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-2">
                    {/* トーンバッジ */}
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-600 px-2.5 py-1 text-xs font-semibold text-white">
                      <span>{TONE_LABELS[item.tone]?.icon || "📝"}</span>
                      {TONE_LABELS[item.tone]?.label || item.tone}
                    </span>

                    {/* ステータスバッジ */}
                    <div>
                      {item.status === "completed" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-600 px-2.5 py-1 text-xs font-semibold text-white">
                          <svg
                            className="h-3 w-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          完了
                        </span>
                      )}
                      {item.status === "failed" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-600 px-2.5 py-1 text-xs font-semibold text-white">
                          <svg
                            className="h-3 w-3"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M6 18L18 6M6 6l12 12"
                            />
                          </svg>
                          失敗
                        </span>
                      )}
                      {item.status === "processing" && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-yellow-600 px-2.5 py-1 text-xs font-semibold text-white">
                          <svg className="h-3 w-3 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                          処理中
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* コンテンツ */}
              <div className="p-5">
                {/* 記事タイトル */}
                <h3 className="text-base font-bold text-gray-900 line-clamp-2 mb-2 group-hover:text-indigo-600 transition-colors">
                  {item.articleTitle}
                </h3>

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
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>{new Date(item.createdAt).toLocaleDateString("ja-JP")}</span>
                  {item.rating && (
                    <span className="flex items-center gap-0.5">
                      {"★".repeat(item.rating)}
                      {"☆".repeat(5 - item.rating)}
                    </span>
                  )}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
