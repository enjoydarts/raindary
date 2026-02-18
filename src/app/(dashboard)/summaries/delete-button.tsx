"use client"

import { useState } from "react"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { deleteSummary, undoDeleteSummary } from "./actions"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

interface DeleteButtonProps {
  summaryId: string
  onDelete?: () => void | Promise<void>
}

export function DeleteButton({ summaryId, onDelete }: DeleteButtonProps) {
  const router = useRouter()
  const [isPending, setIsPending] = useState(false)
  const [open, setOpen] = useState(false)

  const handleDelete = async () => {
    setIsPending(true)

    try {
      await deleteSummary(summaryId)

      // ページをリフレッシュ
      await onDelete?.()

      setOpen(false)

      // Undoトーストを表示
      toast.success("要約を削除しました", {
        action: {
          label: "元に戻す",
          onClick: async () => {
            try {
              await undoDeleteSummary(summaryId)
              router.refresh()
              toast.success("削除を取り消しました")
            } catch (err) {
              console.error("[DeleteButton] Undo error:", err)
              toast.error("元に戻すことができませんでした")
            }
          },
        },
        duration: 5000,
      })
    } catch (err) {
      console.error("[DeleteButton] Error:", err)
      const message = err instanceof Error ? err.message : "削除に失敗しました"
      toast.error("エラーが発生しました", {
        description: message,
      })
    } finally {
      setIsPending(false)
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-slate-500 hover:text-red-600"
        >
          <Trash2 className="h-3.5 w-3.5 mr-1.5" />
          削除
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>要約を削除しますか？</AlertDialogTitle>
          <AlertDialogDescription>
            この操作は取り消せません。要約が完全に削除されます。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>キャンセル</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isPending}
            className="bg-red-600 hover:bg-red-700"
          >
            {isPending ? "削除中..." : "削除"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
