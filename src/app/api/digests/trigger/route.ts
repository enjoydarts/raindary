import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { inngest } from "@/inngest/client"
import { acquireLock } from "@/lib/redis"

const DIGEST_LOCK_TTL_SEC = 60 * 5 // 5分

/**
 * 週次ダイジェストを手動でトリガー
 * POST /api/digests/trigger
 */
function isValidJstDate(date: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(date)
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Authentication required" } },
        { status: 401 }
      )
    }

    const userId = session.user.id

    // 同じユーザーの重複実行を防止
    const lockKey = `raindary:lock:digest:${userId}`
    const locked = await acquireLock(lockKey, DIGEST_LOCK_TTL_SEC)
    if (!locked) {
      return NextResponse.json(
        { error: { code: "ALREADY_RUNNING", message: "Digest generation is already in progress" } },
        { status: 409 }
      )
    }

    let periodStart: string | undefined
    try {
      const body = await request.json()
      if (body?.periodStart !== undefined) {
        if (typeof body.periodStart !== "string" || !isValidJstDate(body.periodStart)) {
          return NextResponse.json(
            {
              error: {
                code: "INVALID_REQUEST",
                message: "periodStart must be YYYY-MM-DD",
              },
            },
            { status: 400 }
          )
        }
        periodStart = body.periodStart
      }
    } catch {
      // ボディなしは許容
    }

    await inngest.send({
      name: "digests/generate-weekly.requested",
      data: { userId, periodStart },
    })

    return NextResponse.json({
      success: true,
      message: "Weekly digest generation started",
      userId,
      periodStart: periodStart ?? null,
    })
  } catch (error) {
    console.error("Digest trigger error:", error)
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to trigger digest generation",
        },
      },
      { status: 500 }
    )
  }
}
