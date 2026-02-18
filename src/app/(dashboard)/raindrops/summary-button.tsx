"use client"

import { useState } from "react"
import { FileText, ChevronDown, Loader2, ClipboardList, Zap, Flame, MessageCircle } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { generateSummary } from "./actions"
import { toast } from "sonner"

interface SummaryButtonProps {
  raindropId: number
}

type Tone = "snarky" | "neutral" | "enthusiastic" | "casual"

const TONE_OPTIONS: { value: Tone; label: string; Icon: LucideIcon; description: string }[] = [
  {
    value: "neutral",
    label: "客観的",
    Icon: ClipboardList,
    description: "事実ベースで淡々と説明",
  },
  {
    value: "snarky",
    label: "毒舌",
    Icon: Zap,
    description: "皮肉・ツッコミを交えた本質的解説",
  },
  {
    value: "enthusiastic",
    label: "熱量高め",
    Icon: Flame,
    description: "ポジティブで前向きな表現",
  },
  {
    value: "casual",
    label: "カジュアル",
    Icon: MessageCircle,
    description: "会話調でリラックスした雰囲気",
  },
]

export function SummaryButton({ raindropId }: SummaryButtonProps) {
  const [loading, setLoading] = useState(false)

  const handleGenerate = async (tone: Tone) => {
    setLoading(true)

    try {
      await generateSummary(raindropId, tone)
      toast.success("要約生成を開始しました", {
        description: "処理には1-2分かかります。完了時に通知します。",
      })
    } catch (err) {
      console.error("[SummaryButton] Error:", err)
      const message = err instanceof Error ? err.message : "要約生成に失敗しました"
      toast.error("エラーが発生しました", {
        description: message,
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <TooltipProvider>
      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
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
          </TooltipTrigger>
          <TooltipContent>
            <p>トーンを選択してAI要約を生成</p>
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent className="w-64">
          {TONE_OPTIONS.map((option) => {
            const OptionIcon = option.Icon
            return (
              <DropdownMenuItem
                key={option.value}
                onClick={() => handleGenerate(option.value)}
                className="cursor-pointer"
              >
                <div className="flex items-start gap-2">
                  <OptionIcon className="h-4 w-4 flex-shrink-0 mt-0.5 text-indigo-600" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900">
                      {option.label}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      {option.description}
                    </div>
                  </div>
                </div>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
    </TooltipProvider>
  )
}
