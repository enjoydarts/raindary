"use client"

import { useState } from "react"
import { Loader2, Sparkles } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function TriggerDigestButton() {
  const [loading, setLoading] = useState(false)
  const [periodStart, setPeriodStart] = useState("")

  const handleTrigger = async () => {
    setLoading(true)

    try {
      const response = await fetch("/api/digests/trigger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodStart: periodStart || undefined,
        }),
      })
      const data = await response.json()

      if (!response.ok) {
        const message = data?.error?.message || "ダイジェスト生成の開始に失敗しました"
        throw new Error(message)
      }

      toast.success("週次ダイジェスト生成を開始しました", {
        description: periodStart
          ? `${periodStart} 開始週の生成を開始しました。完了後に一覧へ反映されます。`
          : "直近1週間分の生成を開始しました。完了後に一覧へ反映されます。",
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "ダイジェスト生成の開始に失敗しました"
      toast.error("エラーが発生しました", {
        description: message,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex w-full flex-col items-start gap-2 sm:w-auto sm:items-end">
      <div className="flex items-center gap-2">
        <Input
          type="date"
          value={periodStart}
          onChange={(e) => setPeriodStart(e.target.value)}
          className="h-9 w-[160px]"
          disabled={loading}
          aria-label="週開始日（JST）"
        />
        <Button
          onClick={handleTrigger}
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-700"
        >
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          {loading ? "開始中..." : "今すぐ生成"}
        </Button>
      </div>
      <p className="text-xs text-slate-500">
        日付を指定するとその日を開始日とする7日間（JST）を生成
      </p>
    </div>
  )
}
