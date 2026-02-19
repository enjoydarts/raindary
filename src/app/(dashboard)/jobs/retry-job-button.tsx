"use client"

import { useState } from "react"
import { RotateCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { retryJob } from "./actions"
import { toast } from "sonner"

interface RetryJobButtonProps {
  summaryId: string
  raindropId: number
  tone: string
}

export function RetryJobButton({ summaryId, raindropId, tone }: RetryJobButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleRetry = async () => {
    setLoading(true)
    try {
      await retryJob({ summaryId, raindropId, tone })
      toast.success("ジョブを再実行しました")
    } catch (error) {
      toast.error("ジョブの再実行に失敗しました")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      onClick={handleRetry}
      disabled={loading}
      className="border-red-300 text-red-600 hover:bg-red-50 hover:text-red-700"
    >
      <RotateCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
      {loading ? "再実行中..." : "再実行"}
    </Button>
  )
}
