"use client"

import { useState } from "react"
import { Trash2, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { deleteRaindrop } from "./actions"

interface DeleteButtonProps {
  raindropId: number
  articleTitle: string
}

export function DeleteButton({ raindropId, articleTitle }: DeleteButtonProps) {
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const handleDelete = async () => {
    setLoading(true)

    try {
      await deleteRaindrop(raindropId)
      setShowConfirm(false)
    } catch (error) {
      console.error("[DeleteButton] Error:", error)
      alert(error instanceof Error ? error.message : "削除に失敗しました")
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowConfirm(true)}
        className="border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300"
      >
        <Trash2 className="h-3.5 w-3.5 mr-1.5" />
        削除
      </Button>

      <Dialog open={showConfirm} onOpenChange={setShowConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>記事を削除しますか？</DialogTitle>
            <DialogDescription className="line-clamp-2">
              「{articleTitle}」を削除します。この操作は元に戻せません。紐づく要約も同時に削除されます。
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirm(false)}
              disabled={loading}
            >
              キャンセル
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={loading}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {loading ? "削除中..." : "削除する"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
