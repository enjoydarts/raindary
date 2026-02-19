"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Sparkles, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

export function ClassifyThemesButton() {
  const router = useRouter()
  const [isClassifying, setIsClassifying] = useState(false)

  const handleClassify = async () => {
    setIsClassifying(true)

    try {
      console.log("[ClassifyThemesButton] Sending request to /api/classify-themes")
      const res = await fetch("/api/classify-themes", {
        method: "POST",
      })

      console.log("[ClassifyThemesButton] Response status:", res.status)

      if (!res.ok) {
        const errorData = await res.json()
        console.error("[ClassifyThemesButton] Error response:", errorData)
        throw new Error("テーマ分類の開始に失敗しました")
      }

      const data = await res.json()
      console.log("[ClassifyThemesButton] Success response:", data)

      toast.success("テーマ分類を開始しました", {
        description: "バックグラウンドで処理中です。完了までお待ちください。",
        duration: 5000,
      })

      // ページをリフレッシュ
      router.refresh()
    } catch (error) {
      console.error("[ClassifyThemesButton] Error:", error)
      toast.error("エラーが発生しました", {
        description: error instanceof Error ? error.message : "不明なエラー",
      })
    } finally {
      setIsClassifying(false)
    }
  }

  return (
    <Button
      onClick={handleClassify}
      disabled={isClassifying}
      variant="outline"
      className="border-purple-200 hover:bg-purple-50"
    >
      {isClassifying ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          分類中...
        </>
      ) : (
        <>
          <Sparkles className="h-4 w-4 mr-2" />
          テーマを自動分類
        </>
      )}
    </Button>
  )
}
