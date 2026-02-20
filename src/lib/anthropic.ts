import Anthropic from "@anthropic-ai/sdk"

/**
 * Anthropic Claude クライアント
 */
const anthropicClientCache = new Map<string, Anthropic>()

function getAnthropicClient(apiKey: string): Anthropic {
  if (!apiKey) {
    throw new Error("Anthropic API key is required")
  }

  const cached = anthropicClientCache.get(apiKey)
  if (cached) {
    return cached
  }

  const client = new Anthropic({ apiKey })
  anthropicClientCache.set(apiKey, client)
  return client
}

/**
 * モデル定義
 * 2026年2月時点の最新モデル
 * https://docs.anthropic.com/en/docs/about-claude/models/overview
 */
export const MODELS = {
  HAIKU: "claude-haiku-4-5",   // $1.00 / $5.00 per 1M tokens
  SONNET: "claude-sonnet-4-6", // $3.00 / $15.00 per 1M tokens
  OPUS: "claude-opus-4-6",     // $5.00 / $25.00 per 1M tokens
} as const

export type ModelType = (typeof MODELS)[keyof typeof MODELS]

/**
 * JSON形式でメッセージを送信
 */
export async function sendJsonMessage<T = any>(params: {
  apiKey: string
  model: ModelType
  system?: string
  messages: Anthropic.MessageParam[]
  maxTokens?: number
}): Promise<{
  content: T
  usage: {
    input_tokens: number
    output_tokens: number
  }
}> {
  const { apiKey, model, system, messages, maxTokens = 2048 } = params

  const response = await getAnthropicClient(apiKey).messages.create({
    model,
    max_tokens: maxTokens,
    system,
    messages,
  })

  // JSON形式のレスポンスをパース
  const textContent = response.content.find((c) => c.type === "text")
  if (!textContent || textContent.type !== "text") {
    throw new Error("No text content in response")
  }

  // JSONブロックを抽出（```json ... ``` 形式も対応）
  let jsonText = textContent.text.trim()
  const jsonBlockMatch = jsonText.match(/```json\s*([\s\S]*?)\s*```/)
  if (jsonBlockMatch) {
    jsonText = jsonBlockMatch[1].trim()
  }

  try {
    const content = JSON.parse(jsonText)
    return {
      content,
      usage: {
        input_tokens: response.usage.input_tokens,
        output_tokens: response.usage.output_tokens,
      },
    }
  } catch (error) {
    console.error("Failed to parse JSON response:", jsonText)
    throw new Error(`Invalid JSON response: ${error}`)
  }
}

/**
 * トークン数を推定（簡易版）
 * 実際のトークン数は使用後にusageから取得
 */
export function estimateTokens(text: string): number {
  // 英語: 約4文字/トークン、日本語: 約2文字/トークン
  // 簡易的に平均3文字/トークンと仮定
  return Math.ceil(text.length / 3)
}
