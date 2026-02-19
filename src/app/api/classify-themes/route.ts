import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { inngest } from "@/inngest/client"

/**
 * テーマ自動分類をトリガー
 * POST /api/classify-themes
 */
export async function POST() {
  try {
    console.log("[classify-themes-api] POST request received")
    console.log("[classify-themes-api] INNGEST_APP_ID:", process.env.INNGEST_APP_ID)
    console.log("[classify-themes-api] INNGEST_EVENT_KEY exists:", !!process.env.INNGEST_EVENT_KEY)

    const session = await auth()

    if (!session?.user?.id) {
      console.log("[classify-themes-api] Unauthorized: no session")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    console.log("[classify-themes-api] User ID:", userId)

    // Inngestイベントを送信
    console.log("[classify-themes-api] Sending Inngest event...")
    const result = await inngest.send({
      name: "summaries/classify-themes.requested",
      data: {
        userId,
      },
    })
    console.log("[classify-themes-api] Inngest event sent:", JSON.stringify(result))

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
