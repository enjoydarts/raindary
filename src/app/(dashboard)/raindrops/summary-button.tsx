"use client"

import { useState, useEffect, useRef } from "react"
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
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // クリック外で閉じる
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [isOpen])

  const handleGenerate = async (tone: Tone) => {
    setLoading(true)
    setError(null)
    setSuccess(false)
    setIsOpen(false)

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
    <div className="flex flex-col gap-2">
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? (
            <>
              <svg
                className="h-3.5 w-3.5 animate-spin"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
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
              生成中...
            </>
          ) : (
            <>
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              要約を生成
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
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </>
          )}
        </button>

        {isOpen && !loading && (
          <div className="absolute z-10 mt-1 w-64 rounded-lg border border-gray-200 bg-white shadow-lg">
            <div className="p-2">
              {TONE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  onClick={() => handleGenerate(option.value)}
                  className="w-full text-left rounded-md px-3 py-2 hover:bg-gray-50 transition-colors"
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
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {success && (
        <div className="rounded-md bg-green-50 border border-green-200 px-3 py-2 text-xs text-green-800">
          <div className="flex items-center gap-1.5">
            <svg
              className="h-4 w-4 flex-shrink-0"
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
            <span>要約生成を開始しました。処理には1-2分かかります。</span>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-800">
          <div className="flex items-start gap-1.5">
            <svg
              className="h-4 w-4 flex-shrink-0 mt-0.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <div>
              <strong className="font-semibold">エラー:</strong>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
