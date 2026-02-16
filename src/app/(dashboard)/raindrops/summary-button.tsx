"use client"

import { useState } from "react"
import { FileText, ChevronDown, Loader2, Check, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { generateSummary } from "./actions"

interface SummaryButtonProps {
  raindropId: number
}

type Tone = "snarky" | "neutral" | "enthusiastic" | "casual"

const TONE_OPTIONS: { value: Tone; label: string; icon: string; description: string }[] = [
  {
    value: "neutral",
    label: "客観的",
    icon: "📋",
    description: "事実ベースで淡々と説明",
  },
  {
    value: "snarky",
    label: "毒舌エンジニア風",
    icon: "😎",
    description: "皮肉・ツッコミを交えた本質的解説",
  },
  {
    value: "enthusiastic",
    label: "熱量高め",
    icon: "🔥",
    description: "ポジティブで前向きな表現",
  },
  {
    value: "casual",
    label: "カジュアル",
    icon: "💬",
    description: "会話調でリラックスした雰囲気",
  },
]

export function SummaryButton({ raindropId }: SummaryButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleGenerate = async (tone: Tone) => {
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      await generateSummary(raindropId, tone)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 5000)
    } catch (err) {
      console.error("[SummaryButton] Error:", err)
      const message = err instanceof Error ? err.message : "要約生成に失敗しました"
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="sm"
            disabled={loading}
            className="bg-green-600 hover:bg-green-700"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                生成中...
              </>
            ) : (
              <>
                <FileText className="h-3.5 w-3.5 mr-1.5" />
                要約を生成
                <ChevronDown className="h-3 w-3 ml-1" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-64">
          {TONE_OPTIONS.map((option) => (
            <DropdownMenuItem
              key={option.value}
              onClick={() => handleGenerate(option.value)}
              className="cursor-pointer"
            >
              <div className="flex items-start gap-2">
                <span className="text-lg">{option.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">
                    {option.label}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {option.description}
                  </div>
                </div>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* メッセージ表示エリア（レイアウトシフト防止） */}
      {success && (
        <div className="mt-2 max-w-md">
          <Alert className="bg-green-50 border-green-200 text-green-800">
            <Check className="h-4 w-4 text-green-800" />
            <AlertDescription className="text-xs">
              要約生成を開始しました。処理には1-2分かかります。
            </AlertDescription>
          </Alert>
        </div>
      )}

      {error && (
        <div className="mt-2 max-w-md">
          <Alert variant="destructive" className="bg-red-50 border-red-200">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">
              <strong className="font-semibold">エラー:</strong>
              <p className="mt-0.5">{error}</p>
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  )
}
