import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/db"
import { summaries } from "@/db/schema"
import { eq, isNotNull, and } from "drizzle-orm"

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

    // ユーザーの要約からユニークなテーマを取得
    const themes = await db
      .selectDistinct({ theme: summaries.theme })
      .from(summaries)
      .where(and(eq(summaries.userId, userId), isNotNull(summaries.theme)))
      .orderBy(summaries.theme)

    return NextResponse.json({
      themes: themes.map((t) => t.theme).filter((t): t is string => t !== null),
    })
  } catch (error) {
    console.error("[themes] Failed to fetch themes:", error)
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 })
  }
}
