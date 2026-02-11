import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import { inngest } from "@/inngest/client"

/**
 * Raindrop同期を手動でトリガー
 * POST /api/import/trigger
 */
export async function POST(request: NextRequest) {
  try {
    // 認証チェック
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("raindrop-session")

    if (!sessionCookie) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      )
    }

    let session
    try {
      session = JSON.parse(sessionCookie.value)
    } catch {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Invalid session" } },
        { status: 401 }
      )
    }

    const userId = session.userId

    // リクエストボディから設定を取得（オプション）
    let filters = {}
    try {
      const body = await request.json()
      filters = body.filters || {}
    } catch {
      // ボディがない場合はデフォルト設定
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
