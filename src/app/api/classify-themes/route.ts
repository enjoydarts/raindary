import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { inngest } from "@/inngest/client"

/**
 * テーマ自動分類をトリガー
 * POST /api/classify-themes
 */
export async function POST() {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id

    // Inngestイベントを送信
    await inngest.send({
      name: "summaries/classify-themes.requested",
      data: {
        userId,
      },
    })

    return NextResponse.json({
      success: true,
      message: "Theme classification started",
    })
  } catch (error) {
    console.error("[classify-themes-api] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
