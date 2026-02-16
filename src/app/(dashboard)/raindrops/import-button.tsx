"use client"

import { useState } from "react"
import { Loader2, Check, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { triggerImport } from "./actions"

export function ImportButton() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleImport = async () => {
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      console.log("[ImportButton] Calling triggerImport...")
      await triggerImport()
      console.log("[ImportButton] Import triggered successfully")
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error("[ImportButton] Error:", err)
      const message = err instanceof Error ? err.message : "インポートに失敗しました"
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="sm:mt-0 mt-4 flex flex-col items-end gap-2">
      <Button
        onClick={handleImport}
        disabled={loading}
        className="bg-indigo-600 hover:bg-indigo-700"
      >
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        {loading ? "取り込み中..." : "今すぐ取り込む"}
      </Button>

      {/* メッセージ表示エリア（高さ固定でレイアウトシフト防止） */}
      <div className="min-h-[40px] w-full max-w-md">
        {error && (
          <Alert variant="destructive" className="bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              <strong>エラー:</strong> {error}
            </AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="bg-green-50 border-green-200 text-green-800">
            <Check className="h-4 w-4 text-green-800" />
            <AlertDescription className="text-sm">
              取り込みを開始しました。処理には数分かかる場合があります。
            </AlertDescription>
          </Alert>
        )}
      </div>
    </div>
  )
}
