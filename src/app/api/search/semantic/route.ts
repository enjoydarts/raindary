import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/db"
import { summaries, raindrops } from "@/db/schema"
import { eq, and, sql, desc } from "drizzle-orm"
import { generateEmbedding } from "@/lib/embeddings"

/**
 * ベクトル検索（意味検索）API
 * GET /api/search/semantic?q=検索クエリ&limit=10
 */
export async function GET(request: NextRequest) {
  try {
    // 認証チェック
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("q")
    const limit = parseInt(searchParams.get("limit") || "10", 10)
    const themeFilter = searchParams.get("theme") // テーマフィルター

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required" },
        { status: 400 }
      )
    }

    // クエリの埋め込みベクトルを生成
    const queryEmbedding = await generateEmbedding(query.trim())

    if (!queryEmbedding || queryEmbedding.length === 0) {
      return NextResponse.json(
        { error: "Failed to generate query embedding" },
        { status: 500 }
      )
    }

    // ベクトル検索（コサイン類似度）
    // pgvectorのコサイン距離: 1 - cosine_similarity
    // 距離が小さいほど似ている
    const vectorString = `[${queryEmbedding.join(",")}]`

    let baseQuery = db
      .select({
        summaryId: summaries.id,
        raindropId: summaries.raindropId,
        title: raindrops.title,
        summary: summaries.summary,
        rating: summaries.rating,
        tone: summaries.tone,
        theme: summaries.theme,
        createdAt: summaries.createdAt,
        similarity: sql<number>`1 - (${summaries.embedding} <=> ${vectorString}::vector)`,
      })
      .from(summaries)
      .innerJoin(
        raindrops,
        and(
          eq(summaries.raindropId, raindrops.id),
          eq(summaries.userId, raindrops.userId)
        )
      )
      .where(
        and(
          eq(summaries.userId, userId),
          eq(summaries.status, "completed"),
          sql`${summaries.embedding} IS NOT NULL`,
          themeFilter ? eq(summaries.theme, themeFilter) : undefined
        )
      )
      .orderBy(sql`${summaries.embedding} <=> ${vectorString}::vector`)
      .limit(limit)

    const results = await baseQuery

    return NextResponse.json({
      query,
      results: results.map((r) => ({
        summaryId: r.summaryId,
        raindropId: r.raindropId,
        title: r.title,
        summary: r.summary,
        rating: r.rating,
        tone: r.tone,
        theme: r.theme,
        createdAt: r.createdAt,
        similarity: r.similarity,
      })),
      count: results.length,
    })
  } catch (error) {
    console.error("[semantic-search] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
