"use client"

import { useState, useEffect } from "react"
import { Keyboard } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

export function KeyboardShortcutsHelp() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // ?: ヘルプを表示
      if (e.key === "?" && !e.shiftKey) {
        e.preventDefault()
        setOpen(true)
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [])

  const shortcuts = [
    { keys: ["/"], description: "検索にフォーカス" },
    { keys: ["Cmd", "K"], description: "検索にフォーカス" },
    { keys: ["d"], description: "ダッシュボードへ移動" },
    { keys: ["r"], description: "記事一覧へ移動" },
    { keys: ["s"], description: "要約一覧へ移動" },
    { keys: ["j"], description: "ジョブ管理へ移動" },
    { keys: ["n"], description: "通知へ移動" },
    { keys: ["t"], description: "統計へ移動" },
    { keys: ["?"], description: "このヘルプを表示" },
  ]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="text-slate-500">
          <Keyboard className="h-4 w-4 mr-2" />
          ショートカット
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>キーボードショートカット</DialogTitle>
          <DialogDescription>
            キーボードショートカットで素早く操作できます
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 mt-4">
          {shortcuts.map((shortcut, index) => (
            <div key={index} className="flex items-center justify-between">
              <span className="text-sm text-slate-600">{shortcut.description}</span>
              <div className="flex gap-1">
                {shortcut.keys.map((key, i) => (
                  <kbd
                    key={i}
                    className="px-2 py-1 text-xs font-semibold text-slate-800 bg-slate-100 border border-slate-300 rounded"
                  >
                    {key}
                  </kbd>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
