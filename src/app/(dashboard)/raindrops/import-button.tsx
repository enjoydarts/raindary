"use client"

import { useState } from "react"
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
      <button
        onClick={handleImport}
        disabled={loading}
        className="inline-flex items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? "取り込み中..." : "今すぐ取り込む"}
      </button>

      {/* メッセージ表示エリア（高さ固定でレイアウトシフト防止） */}
      <div className="min-h-[40px] w-full max-w-md">
        {error && (
          <div className="rounded-md bg-red-50 p-2 text-sm text-red-800">
            <strong>エラー:</strong> {error}
          </div>
        )}

        {success && (
          <div className="rounded-md bg-green-50 p-2 text-sm text-green-800">
            取り込みを開始しました。処理には数分かかる場合があります。
          </div>
        )}
      </div>
    </div>
  )
}
