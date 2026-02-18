"use client"

import { useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { triggerImport } from "./actions"
import { toast } from "sonner"

export function ImportButton() {
  const [loading, setLoading] = useState(false)

  const handleImport = async () => {
    setLoading(true)

    try {
      console.log("[ImportButton] Calling triggerImport...")
      await triggerImport()
      console.log("[ImportButton] Import triggered successfully")
      toast.success("記事の取り込みを開始しました", {
        description: "処理には数分かかる場合があります。完了時に通知します。",
      })
    } catch (err) {
      console.error("[ImportButton] Error:", err)
      const message = err instanceof Error ? err.message : "インポートに失敗しました"
      toast.error("エラーが発生しました", {
        description: message,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            onClick={handleImport}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {loading ? "取り込み中..." : "今すぐ取り込む"}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Raindrop.ioから最新の記事を同期</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
