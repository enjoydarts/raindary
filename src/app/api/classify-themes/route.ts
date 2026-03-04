import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { inngest } from "@/inngest/client"
import { cacheDel } from "@/lib/redis"

/**
 * テーマ自動分類をトリガー
 * POST /api/classify-themes
 * POST /api/classify-themes?force=true (全件再分類)
 */
export async function POST(request: Request) {
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

    // forceパラメータを取得
    const { searchParams } = new URL(request.url)
    const force = searchParams.get("force") === "true"
    console.log("[classify-themes-api] Force mode:", force)

    // テーマが変わるのでキャッシュを無効化
    await cacheDel(`raindary:themes:${userId}`)

    // Inngestイベントを送信
    console.log("[classify-themes-api] Sending Inngest event...")
    const result = await inngest.send({
      name: "summaries/classify-themes.requested",
      data: {
        userId,
        force, // 強制再分類フラグ
      },
    })
    console.log("[classify-themes-api] Inngest event sent:", JSON.stringify(result))

    return NextResponse.json({
      success: true,
      message: force ? "Theme regeneration started" : "Theme classification started",
    })
  } catch (error) {
    console.error("[classify-themes-api] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
