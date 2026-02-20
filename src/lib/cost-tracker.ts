import { apiUsage, users } from "@/db/schema"
import { and, eq, gte, sql } from "drizzle-orm"

/**
 * Anthropic API価格表（2026年2月時点）
 * https://docs.anthropic.com/en/docs/about-claude/models/overview
 */
const ANTHROPIC_PRICING = {
  // --- 現行モデル ---
  "claude-opus-4-6": {
    input: 5.0 / 1_000_000,  // $5.00 per 1M tokens
    output: 25.0 / 1_000_000, // $25.00 per 1M tokens
  },
  "claude-sonnet-4-6": {
    input: 3.0 / 1_000_000,  // $3.00 per 1M tokens
    output: 15.0 / 1_000_000, // $15.00 per 1M tokens
  },
  "claude-haiku-4-5": {
    input: 1.0 / 1_000_000,  // $1.00 per 1M tokens
    output: 5.0 / 1_000_000,  // $5.00 per 1M tokens
  },
  // --- 旧モデル（既存データのコスト表示用） ---
  "claude-sonnet-4-5": {
    input: 3.0 / 1_000_000,
    output: 15.0 / 1_000_000,
  },
  "claude-3-5-sonnet-20241022": {
    input: 3.0 / 1_000_000,
    output: 15.0 / 1_000_000,
  },
  "claude-3-5-haiku-20241022": {
    input: 1.0 / 1_000_000,
    output: 5.0 / 1_000_000,
  },
} as const

/**
 * OpenAI API価格表（2026年2月時点）
 * https://openai.com/api/pricing/
 */
const OPENAI_PRICING = {
  "text-embedding-3-small": {
    input: 0.02 / 1_000_000, // $0.020 per 1M tokens
    output: 0, // Embeddingsは出力トークンなし
  },
  "text-embedding-3-large": {
    input: 0.13 / 1_000_000, // $0.130 per 1M tokens
    output: 0,
  },
  "text-embedding-ada-002": {
    input: 0.10 / 1_000_000, // $0.100 per 1M tokens
    output: 0,
  },
  "gpt-4o-mini": {
    input: 0.15 / 1_000_000, // $0.150 per 1M tokens
    output: 0.60 / 1_000_000, // $0.600 per 1M tokens
  },
} as const

/**
 * Anthropic コストを計算
 */
export function calculateAnthropicCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = ANTHROPIC_PRICING[model as keyof typeof ANTHROPIC_PRICING]

  if (!pricing) {
    console.warn(`Unknown Anthropic model for pricing: ${model}`)
    return 0
  }

  return inputTokens * pricing.input + outputTokens * pricing.output
}

/**
 * OpenAI コストを計算
 */
export function calculateOpenAICost(
  model: string,
  inputTokens: number,
  outputTokens: number = 0
): number {
  const pricing = OPENAI_PRICING[model as keyof typeof OPENAI_PRICING]

  if (!pricing) {
    console.warn(`Unknown OpenAI model for pricing: ${model}`)
    return 0
  }

  return inputTokens * pricing.input + outputTokens * pricing.output
}

/**
 * 後方互換性のため
 * @deprecated Use calculateAnthropicCost instead
 */
export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number
): number {
  return calculateAnthropicCost(model, inputTokens, outputTokens)
}

/**
 * Anthropic API使用状況を記録
 */
export async function trackAnthropicUsage(params: {
  userId: string
  summaryId?: string
  model: string
  inputTokens: number
  outputTokens: number
}): Promise<void> {
  const { userId, summaryId, model, inputTokens, outputTokens } = params
  const { db } = await import("@/db")

  const cost = calculateAnthropicCost(model, inputTokens, outputTokens)

  await db.insert(apiUsage).values({
    userId,
    summaryId: summaryId || null,
    apiProvider: "anthropic",
    model,
    inputTokens,
    outputTokens,
    costUsd: cost.toFixed(6),
  })
}

/**
 * OpenAI API使用状況を記録
 */
export async function trackOpenAIUsage(params: {
  userId: string
  summaryId?: string
  model: string
  inputTokens: number
  outputTokens?: number
}): Promise<void> {
  const { userId, summaryId, model, inputTokens, outputTokens = 0 } = params
  const { db } = await import("@/db")

  const cost = calculateOpenAICost(model, inputTokens, outputTokens)

  await db.insert(apiUsage).values({
    userId,
    summaryId: summaryId || null,
    apiProvider: "openai",
    model,
    inputTokens,
    outputTokens,
    costUsd: cost.toFixed(6),
  })
}

/**
 * Raindrop API使用状況を記録
 */
export async function trackRaindropUsage(params: { userId: string }): Promise<void> {
  const { userId } = params
  const { db } = await import("@/db")

  await db.insert(apiUsage).values({
    userId,
    apiProvider: "raindrop",
    costUsd: "0", // 無料
  })
}

/**
 * Extract API使用状況を記録
 */
export async function trackExtractUsage(params: { userId: string }): Promise<void> {
  const { userId } = params
  const { db } = await import("@/db")

  await db.insert(apiUsage).values({
    userId,
    apiProvider: "extract",
    costUsd: "0", // 自前サービスなので無料
  })
}

/**
 * 当月の累積コスト（USD）を取得
 */
export async function getMonthlyCostUsd(userId: string, now: Date = new Date()): Promise<number> {
  const { db } = await import("@/db")
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [row] = await db
    .select({
      total: sql<string>`COALESCE(SUM(${apiUsage.costUsd}), 0)`,
    })
    .from(apiUsage)
    .where(and(eq(apiUsage.userId, userId), gte(apiUsage.createdAt, monthStart)))

  return Number(row?.total || 0)
}

/**
 * ユーザーの予算上限を取得（未設定時は環境変数DEFAULT_MONTHLY_BUDGET_USD）
 */
export async function getMonthlyBudgetUsd(userId: string): Promise<number | null> {
  const { db } = await import("@/db")
  const [user] = await db
    .select({ monthlyBudgetUsd: users.monthlyBudgetUsd })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  const configured = user?.monthlyBudgetUsd ? Number(user.monthlyBudgetUsd) : null
  if (configured && configured > 0) {
    return configured
  }

  const fallback = Number(process.env.DEFAULT_MONTHLY_BUDGET_USD || "0")
  return fallback > 0 ? fallback : null
}
