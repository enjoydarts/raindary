import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/db"
import { summaries } from "@/db/schema"
import { eq, isNotNull, and } from "drizzle-orm"
import { cacheGet, cacheSet } from "@/lib/redis"

const THEMES_TTL_SEC = 60 * 5 // 5分

/**
 * ユーザーの要約に存在するテーマ一覧を取得
 */
export async function GET(req: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const cacheKey = `raindary:themes:${userId}`

    // Redisキャッシュを確認
    const cached = await cacheGet<string[]>(cacheKey)
    if (cached) {
      return NextResponse.json({ themes: cached })
    }

    // ユーザーの要約からユニークなテーマを取得
    const rows = await db
      .selectDistinct({ theme: summaries.theme })
      .from(summaries)
      .where(and(eq(summaries.userId, userId), isNotNull(summaries.theme)))
      .orderBy(summaries.theme)

    const themes = rows.map((t) => t.theme).filter((t): t is string => t !== null)

    await cacheSet(cacheKey, themes, THEMES_TTL_SEC)

    return NextResponse.json({ themes })
  } catch (error) {
    console.error("[themes] Failed to fetch themes:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
