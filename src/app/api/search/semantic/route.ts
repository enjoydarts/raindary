import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/db"
import { summaries, raindrops, users } from "@/db/schema"
import { eq, and, sql } from "drizzle-orm"
import { generateEmbedding } from "@/lib/embeddings"
import { decrypt } from "@/lib/crypto"

const QUERY_CACHE_TTL_MS = 1000 * 60 * 30
const queryEmbeddingCache = new Map<string, { embedding: number[]; expiresAt: number }>()

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

    const [user] = await db
      .select({ openaiApiKeyEncrypted: users.openaiApiKeyEncrypted })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)

    if (!user?.openaiApiKeyEncrypted) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured. Please set it in /settings." },
        { status: 400 }
      )
    }

    const openaiApiKey = decrypt(user.openaiApiKeyEncrypted)

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required" },
        { status: 400 }
      )
    }

    // クエリの埋め込みベクトルを生成
    const normalizedQuery = query.trim().toLowerCase()
    const cached = queryEmbeddingCache.get(normalizedQuery)
    let queryEmbedding: number[]

    if (cached && cached.expiresAt > Date.now()) {
      queryEmbedding = cached.embedding
    } else {
      queryEmbedding = await generateEmbedding(query.trim(), { apiKey: openaiApiKey })
      queryEmbeddingCache.set(normalizedQuery, {
        embedding: queryEmbedding,
        expiresAt: Date.now() + QUERY_CACHE_TTL_MS,
      })
    }

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

    const filteredResults = results
      .map((r) => ({
        summaryId: r.summaryId,
        raindropId: r.raindropId,
        title: r.title,
        summary: r.summary,
        rating: r.rating,
        tone: r.tone,
        theme: r.theme,
        createdAt: r.createdAt,
        similarity: r.similarity,
      }))
      .filter((r) => r.similarity >= 0.5)

    return NextResponse.json({
      query,
      results: filteredResults,
      count: filteredResults.length,
    })
  } catch (error) {
    console.error("[semantic-search] Error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}
