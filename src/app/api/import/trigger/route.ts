import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { inngest } from "@/inngest/client"
import { db } from "@/db"
import { users } from "@/db/schema"
import { eq } from "drizzle-orm"
import { acquireLock } from "@/lib/redis"

const IMPORT_LOCK_TTL_SEC = 60 * 5 // 5分

/**
 * Raindrop同期を手動でトリガー
 * POST /api/import/trigger
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // 同じユーザーの重複実行を防止
    const lockKey = `raindary:lock:import:${userId}`
    const locked = await acquireLock(lockKey, IMPORT_LOCK_TTL_SEC)
    if (!locked) {
      return NextResponse.json(
        { error: { code: "ALREADY_RUNNING", message: "Import is already in progress" } },
        { status: 409 }
      )
    }

    const [user] = await db
      .select({ defaultImportCollectionId: users.defaultImportCollectionId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    // リクエストボディから設定を取得（オプション）
    let filters = {}
    try {
      const body = await request.json()
      filters = body.filters || {}
      if (
        !(filters as { collectionId?: number }).collectionId &&
        user?.defaultImportCollectionId
      ) {
        filters = { ...filters, collectionId: user.defaultImportCollectionId }
      }
    } catch {
      // ボディがない場合はデフォルト設定
      if (user?.defaultImportCollectionId) {
        filters = { collectionId: user.defaultImportCollectionId }
      }
    }

    // Inngestイベントを送信
    await inngest.send({
      name: "raindrop/import.requested",
      data: {
        userId,
        filters,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Import started",
      userId,
    })
  } catch (error) {
    console.error("Import trigger error:", error)
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to trigger import",
        },
      },
      { status: 500 }
    )
  }
}
