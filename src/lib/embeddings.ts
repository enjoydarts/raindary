import { trackOpenAIUsage } from "./cost-tracker"

const EMBEDDING_MODEL = "text-embedding-3-small"

/**
 * OpenAI Embeddings API を使用してテキストの埋め込みベクトルを生成
 */
export async function generateEmbedding(
  text: string,
  options?: {
    apiKey?: string
    userId?: string
    summaryId?: string
  }
): Promise<number[]> {
  const apiKey = options?.apiKey

  if (!apiKey) {
    console.warn("[embeddings] OpenAI API key not set, skipping embedding generation")
    return []
  }

  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text,
        encoding_format: "float",
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`OpenAI API error: ${response.status} ${error}`)
    }

    const data = await response.json()

    // コストトラッキング
    if (options?.userId) {
      const usage = data.usage
      await trackOpenAIUsage({
        userId: options.userId,
        summaryId: options.summaryId,
        model: EMBEDDING_MODEL,
        inputTokens: usage.total_tokens || 0,
      })
    }

    return data.data[0].embedding as number[]
  } catch (error) {
    console.error("[embeddings] Failed to generate embedding:", error)
    throw error
  }
}

/**
 * コサイン類似度を計算
 */
export function cosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error("Vectors must have the same length")
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i]
    normA += vecA[i] * vecA[i]
    normB += vecB[i] * vecB[i]
  }

  normA = Math.sqrt(normA)
  normB = Math.sqrt(normB)

  if (normA === 0 || normB === 0) {
    return 0
  }

  return dotProduct / (normA * normB)
}
