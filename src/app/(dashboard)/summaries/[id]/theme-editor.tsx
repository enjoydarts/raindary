"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Pencil, Check, X } from "lucide-react"
import { toast } from "sonner"
import { updateTheme } from "./actions"
import { useRouter } from "next/navigation"

interface ThemeEditorProps {
  summaryId: string
  currentTheme: string | null
  availableThemes: string[]
}

export function ThemeEditor({ summaryId, currentTheme, availableThemes }: ThemeEditorProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [theme, setTheme] = useState(currentTheme || "")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    setTheme(currentTheme || "")
  }, [currentTheme])

  const handleSave = async () => {
    setIsSubmitting(true)

    try {
      await updateTheme(summaryId, theme.trim() || null)
      toast.success("テーマを更新しました")
      setIsEditing(false)
      router.refresh()
    } catch (error) {
      toast.error("テーマの更新に失敗しました")
      console.error(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    setTheme(currentTheme || "")
    setIsEditing(false)
  }

  if (!isEditing) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex-1">
          {currentTheme ? (
            <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
              {currentTheme}
            </Badge>
          ) : (
            <span className="text-sm text-slate-400">未分類</span>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsEditing(true)}
          className="h-8 px-2"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Input
          type="text"
          value={theme}
          onChange={(e) => setTheme(e.target.value)}
          placeholder="テーマを入力"
          className="flex-1"
          list="available-themes"
        />
        <datalist id="available-themes">
          {availableThemes.map((t) => (
            <option key={t} value={t} />
          ))}
        </datalist>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={isSubmitting}
          className="bg-green-600 hover:bg-green-700"
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleCancel}
          disabled={isSubmitting}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* 既存テーマのクイック選択 */}
      {availableThemes.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {availableThemes.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTheme(t)}
              className="text-xs px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors"
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
