import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/auth"
import { db } from "@/db"
import { summaries, raindrops, users } from "@/db/schema"
import { eq, and, isNull, sql } from "drizzle-orm"
import { generateEmbedding } from "@/lib/embeddings"
import { decrypt } from "@/lib/crypto"
import { cacheGet, cacheSet } from "@/lib/redis"

const QUERY_EMBEDDING_TTL_SEC = 60 * 30 // 30分

/**
 * クエリに対するスニペットを抽出する
 * キーワードが見つかった場合はその周辺を、見つからない場合は先頭部分を返す
 */
function extractSnippet(text: string, query: string, contextLen = 80, maxLen = 220): string {
  const idx = text.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) {
    return text.length > maxLen ? text.slice(0, maxLen) + "…" : text
  }
  const start = Math.max(0, idx - contextLen)
  const end = Math.min(text.length, idx + query.length + contextLen)
  const prefix = start > 0 ? "…" : ""
  const suffix = end < text.length ? "…" : ""
  return prefix + text.slice(start, end) + suffix
}

/**
 * ハイブリッド意味検索API
 * GET /api/search/semantic?q=検索クエリ&limit=10&theme=テーマ
 */
export async function GET(request: NextRequest) {
  try {
    const session = await auth()
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get("q")
    const limit = Math.min(parseInt(searchParams.get("limit") || "10", 10), 50)
    const themeFilter = searchParams.get("theme")

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { error: "Query parameter 'q' is required" },
        { status: 400 }
      )
    }

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

    // クエリの埋め込みベクトルを生成（Redisキャッシュ利用）
    const normalizedQuery = query.trim().toLowerCase()
    const cacheKey = `raindary:emb:${normalizedQuery}`
    let queryEmbedding: number[]

    const cachedEmbedding = await cacheGet<number[]>(cacheKey)
    if (cachedEmbedding) {
      queryEmbedding = cachedEmbedding
    } else {
      queryEmbedding = await generateEmbedding(query.trim(), { apiKey: openaiApiKey })
      await cacheSet(cacheKey, queryEmbedding, QUERY_EMBEDDING_TTL_SEC)
    }

    if (!queryEmbedding || queryEmbedding.length === 0) {
      return NextResponse.json(
        { error: "Failed to generate query embedding" },
        { status: 500 }
      )
    }

    const vectorString = `[${queryEmbedding.join(",")}]`
    const keywordPattern = `%${normalizedQuery}%`

    // ハイブリッドスコア: ベクトル類似度(70%) + キーワードマッチ(30%)
    const vectorScore = sql<number>`1 - (${summaries.embedding} <=> ${vectorString}::vector)`
    const keywordScore = sql<number>`CASE WHEN LOWER(${summaries.summary}) LIKE ${keywordPattern} OR LOWER(${raindrops.title}) LIKE ${keywordPattern} THEN 1.0 ELSE 0.0 END`
    const hybridScore = sql<number>`(0.7 * (1 - (${summaries.embedding} <=> ${vectorString}::vector))) + (0.3 * CASE WHEN LOWER(${summaries.summary}) LIKE ${keywordPattern} OR LOWER(${raindrops.title}) LIKE ${keywordPattern} THEN 1.0 ELSE 0.0 END)`

    const results = await db
      .select({
        summaryId: summaries.id,
        raindropId: summaries.raindropId,
        title: raindrops.title,
        link: raindrops.link,
        summary: summaries.summary,
        rating: summaries.rating,
        tone: summaries.tone,
        theme: summaries.theme,
        createdAt: summaries.createdAt,
        vectorScore,
        keywordScore,
        hybridScore,
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
          isNull(summaries.deletedAt),
          sql`${summaries.embedding} IS NOT NULL`,
          themeFilter ? eq(summaries.theme, themeFilter) : undefined
        )
      )
      .orderBy(sql`${hybridScore} DESC`)
      .limit(limit)

    const filteredResults = results
      .filter((r) => r.hybridScore >= 0.35)
      .map((r) => ({
        summaryId: r.summaryId,
        raindropId: r.raindropId,
        title: r.title,
        link: r.link,
        summary: r.summary,
        snippet: extractSnippet(r.summary, query.trim()),
        keywordMatch: r.keywordScore >= 1.0,
        rating: r.rating,
        tone: r.tone,
        theme: r.theme,
        createdAt: r.createdAt,
        similarity: Math.min(r.hybridScore, 1.0),
      }))

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
