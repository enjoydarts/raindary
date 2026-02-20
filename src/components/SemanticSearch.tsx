"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, Sparkles, Loader2, Clock, X, CircleHelp } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import Link from "next/link"

interface SearchResult {
  summaryId: string
  raindropId: number
  title: string
  link: string
  summary: string
  snippet: string
  keywordMatch: boolean
  rating: number | null
  tone: string
  theme: string | null
  createdAt: string
  similarity: number
}

const HISTORY_KEY = "semantic_search_history"
const MAX_HISTORY = 8

function getHistory(): string[] {
  if (typeof window === "undefined") return []
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]")
  } catch {
    return []
  }
}

function saveToHistory(query: string) {
  const history = getHistory().filter((h) => h !== query)
  history.unshift(query)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)))
}

function removeFromHistory(query: string) {
  const history = getHistory().filter((h) => h !== query)
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
}

/**
 * クエリ文字列をハイライトして返す
 */
function HighlightedText({ text, query }: { text: string; query: string }) {
  if (!query.trim()) return <span>{text}</span>
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return <span>{text}</span>
  return (
    <span>
      {text.slice(0, idx)}
      <mark className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5 not-italic font-medium">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </span>
  )
}

export function SemanticSearch() {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [history, setHistory] = useState<string[]>([])
  const [showHistory, setShowHistory] = useState(false)

  useEffect(() => {
    setHistory(getHistory())
  }, [])

  const handleSearch = useCallback(async (searchQuery?: string) => {
    const q = (searchQuery ?? query).trim()
    if (!q) return

    setIsSearching(true)
    setError(null)
    setShowHistory(false)

    try {
      const res = await fetch(
        `/api/search/semantic?q=${encodeURIComponent(q)}&limit=10`
      )

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "検索に失敗しました")
      }

      const data = await res.json()
      setResults(data.results || [])
      saveToHistory(q)
      setHistory(getHistory())
      if (searchQuery) setQuery(searchQuery)
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました")
    } finally {
      setIsSearching(false)
    }
  }, [query])

  const handleClear = () => {
    setResults([])
    setQuery("")
    setError(null)
  }

  const handleRemoveHistory = (item: string, e: React.MouseEvent) => {
    e.stopPropagation()
    removeFromHistory(item)
    setHistory(getHistory())
  }

  return (
    <div className="space-y-4">
      {/* 検索入力 */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <Sparkles className="h-5 w-5 text-indigo-400" />
          </div>
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setShowHistory(true)}
            onBlur={() => setTimeout(() => setShowHistory(false), 150)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSearch()
              if (e.key === "Escape") setShowHistory(false)
            }}
            placeholder="意味で検索... (例: 認証について、パフォーマンス改善)"
            className="pl-10"
          />

          {/* 検索履歴ドロップダウン */}
          {showHistory && history.length > 0 && results.length === 0 && (
            <div className="absolute top-full left-0 right-0 z-10 mt-1 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-lg">
              <div className="p-2">
                <p className="text-xs text-slate-500 dark:text-slate-400 px-2 py-1 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  最近の検索
                </p>
                {history.map((item) => (
                  <div
                    key={item}
                    className="flex items-center justify-between rounded px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer group"
                    onMouseDown={() => handleSearch(item)}
                  >
                    <span className="text-sm text-slate-700 dark:text-slate-300 truncate">{item}</span>
                    <button
                      className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-opacity"
                      onMouseDown={(e) => handleRemoveHistory(item, e)}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        <Button
          onClick={() => handleSearch()}
          disabled={isSearching || !query.trim()}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          {isSearching ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Search className="h-4 w-4 mr-2" />
              検索
            </>
          )}
        </Button>
        <Dialog>
          <DialogTrigger asChild>
            <Button type="button" variant="outline">
              <CircleHelp className="h-4 w-4 mr-1.5" />
              使い方
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>AI意味検索（ハイブリッド）</DialogTitle>
              <DialogDescription>
                ベクトル類似度とキーワードマッチを組み合わせて検索します。
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-sm text-slate-700 dark:text-slate-300">
              例: 「認証」で検索すると、OAuth、JWT、セキュリティ関連の記事がヒットします。
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="rounded-md bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800 px-4 py-3">
          <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
        </div>
      )}

      {/* 検索結果 */}
      {results.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {results.length}件の関連記事が見つかりました
            </h3>
            <Button variant="ghost" size="sm" onClick={handleClear}>
              クリア
            </Button>
          </div>

          <div className="space-y-3">
            {results.map((result) => (
              <Link key={result.summaryId} href={`/summaries/${result.summaryId}`}>
                <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer">
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-4">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 leading-snug">
                        <HighlightedText text={result.title} query={query} />
                      </h4>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {result.keywordMatch && (
                          <Badge variant="outline" className="text-xs text-amber-600 border-amber-300 dark:text-amber-400 dark:border-amber-700">
                            KW
                          </Badge>
                        )}
                        <Badge variant="outline" className="text-xs">
                          {Math.round(result.similarity * 100)}% 一致
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                      <HighlightedText text={result.snippet} query={query} />
                    </p>
                    <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      {result.theme && (
                        <Badge variant="secondary" className="text-xs">
                          {result.theme}
                        </Badge>
                      )}
                      <span>{result.tone}</span>
                      {result.rating && (
                        <span>{"★".repeat(result.rating)}</span>
                      )}
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 検索結果なし */}
      {results.length === 0 && !error && !isSearching && query.trim() !== "" && (
        <div className="text-center py-8 text-slate-500 dark:text-slate-400">
          <p className="text-sm">「{query}」に関連する記事が見つかりませんでした</p>
        </div>
      )}

    </div>
  )
}
