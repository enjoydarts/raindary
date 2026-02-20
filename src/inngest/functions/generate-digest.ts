import { inngest } from "../client"
import { db } from "@/db"
import { summaries, raindrops, users, digests } from "@/db/schema"
import { eq, and, gte, lt, isNull, desc } from "drizzle-orm"
import { decrypt } from "@/lib/crypto"
import { trackAnthropicUsage } from "@/lib/cost-tracker"
import Anthropic from "@anthropic-ai/sdk"

const DAY_MS = 24 * 60 * 60 * 1000

function jstDateToUtcDate(date: string): Date {
  const [year, month, day] = date.split("-").map(Number)
  return new Date(Date.UTC(year, month - 1, day, -9, 0, 0, 0))
}

function getJstTodayStartUtcDate(baseDate: Date): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(baseDate)

  const year = Number(parts.find((p) => p.type === "year")?.value)
  const month = Number(parts.find((p) => p.type === "month")?.value)
  const day = Number(parts.find((p) => p.type === "day")?.value)

  return new Date(Date.UTC(year, month - 1, day, -9, 0, 0, 0))
}

function formatDateJst(date: Date): string {
  return new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date)
}

async function runWeeklyDigest({
  step,
  logger,
  targetUserId,
  periodStartJstDate,
}: {
  step: any
  logger: any
  targetUserId?: string
  periodStartJstDate?: string
}) {
  // 対象期間を計算（JST基準）
  const periodStart = periodStartJstDate
    ? jstDateToUtcDate(periodStartJstDate)
    : new Date(getJstTodayStartUtcDate(new Date()).getTime() - 7 * DAY_MS)
  const periodEnd = new Date(periodStart.getTime() + 7 * DAY_MS)

  logger.info("Generating weekly digests", {
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    targetUserId: targetUserId || null,
    periodStartJstDate: periodStartJstDate || null,
  })

  // 先週に完了した要約を持つユーザーを取得
  const activeUsers = await step.run("fetch-active-users", async () => {
    if (targetUserId) {
      return [targetUserId]
    }
    const rows = await db
      .selectDistinct({ userId: summaries.userId })
      .from(summaries)
      .where(
        and(
          isNull(summaries.deletedAt),
          eq(summaries.status, "completed"),
          gte(summaries.createdAt, periodStart),
          lt(summaries.createdAt, periodEnd)
        )
      )
    return rows.map((r) => r.userId)
  })

  logger.info(`Found ${activeUsers.length} active users for digest`)

  const results = []
  const stepSuffix = periodStart.toISOString().slice(0, 10)

  for (const userId of activeUsers) {
    const result = await step.run(`generate-digest-${userId}-${stepSuffix}`, async () => {
      // ユーザーのAPIキーを取得
      const [user] = await db
        .select({ anthropicApiKeyEncrypted: users.anthropicApiKeyEncrypted })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1)

      if (!user?.anthropicApiKeyEncrypted) {
        return { userId, skipped: true, reason: "no_api_key" }
      }

      const apiKey = decrypt(user.anthropicApiKeyEncrypted)

      // 先週の要約を取得（記事情報と結合）
      const weeklySummaries = await db
        .select({
          summary: summaries.summary,
          tone: summaries.tone,
          theme: summaries.theme,
          rating: summaries.rating,
          articleTitle: raindrops.title,
          createdAt: summaries.createdAt,
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
            isNull(summaries.deletedAt),
            eq(summaries.status, "completed"),
            gte(summaries.createdAt, periodStart),
            lt(summaries.createdAt, periodEnd)
          )
        )
        .orderBy(desc(summaries.createdAt))
        .limit(50)

      if (weeklySummaries.length === 0) {
        return { userId, skipped: true, reason: "no_summaries" }
      }

      // トップテーマを集計
      const themeCount = new Map<string, number>()
      weeklySummaries.forEach((s) => {
        if (s.theme) {
          themeCount.set(s.theme, (themeCount.get(s.theme) || 0) + 1)
        }
      })
      const topThemes = Array.from(themeCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([theme]) => theme)

      // Claude でダイジェストを生成
      const summaryTexts = weeklySummaries
        .map(
          (s, i) =>
            `${i + 1}. 【${s.articleTitle}】${s.theme ? `(テーマ: ${s.theme})` : ""}\n${s.summary}`
        )
        .join("\n\n")

      const prompt = `以下は対象期間（${formatDateJst(periodStart)} 〜 ${formatDateJst(new Date(periodEnd.getTime() - 1))}）に読んだ記事の要約${weeklySummaries.length}件です。

${summaryTexts}

これらの要約を分析して、以下の形式で週次ダイジェストを日本語で作成してください。

【重要: 出力ルール（Markdown厳守）】
- 見出しは「## 」で始める（全角の＃は禁止）
- 箇条書きは必ず「- 」を使う（「・」や「●」は禁止）
- 番号付きは必ず「1. 」形式を使う（「1)」や「１.」は禁止）
- 強調は「**太字**」を使う
- コードブロックは使わない
- 各セクションの間は1行空ける

## 今週の読書トレンド

（全体的な傾向・共通テーマを2〜3文で）

## 注目トピック

（特に重要または繰り返し登場したテーマを「- 」の箇条書きで3〜5個）

## 学びのポイント

（今週の読書から得られた重要な洞察を「1. 」の番号付きリストで2〜3個）

## 来週へのおすすめ

（今週の読書傾向から、来週読むとよい分野や視点の提案を2〜3文）`

      const client = new Anthropic({ apiKey })
      const message = await client.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      })

      const content = message.content[0]
      if (content.type !== "text") {
        return { userId, skipped: true, reason: "unexpected_response" }
      }

      // コストトラッキング
      await trackAnthropicUsage({
        userId,
        model: "claude-haiku-4-5",
        inputTokens: message.usage.input_tokens,
        outputTokens: message.usage.output_tokens,
      }).catch((err) => logger.warn("Failed to track digest cost", { err }))

      // ダイジェストを保存
      await db
        .insert(digests)
        .values({
          userId,
          period: "weekly",
          periodStart,
          periodEnd,
          content: content.text,
          summaryCount: weeklySummaries.length,
          topThemes,
        })
        .onConflictDoUpdate({
          target: [digests.userId, digests.period, digests.periodStart, digests.periodEnd],
          set: {
            content: content.text,
            summaryCount: weeklySummaries.length,
            topThemes,
            createdAt: new Date(),
          },
        })

      return { userId, success: true, summaryCount: weeklySummaries.length }
    })

    results.push(result)
  }

  return {
    period: "weekly",
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    results,
  }
}

/**
 * 週次ダイジェスト生成（毎週月曜 JST 00:00）
 * 先週1週間の要約をAIがメタ分析してダイジェストを生成
 */
export const generateWeeklyDigest = inngest.createFunction(
  {
    id: "generate-weekly-digest",
    retries: 2,
    concurrency: { limit: 3 },
  },
  { cron: "TZ=Asia/Tokyo 0 0 * * 1" }, // 毎週月曜 JST 00:00
  async ({ step, logger }) => runWeeklyDigest({ step, logger })
)

/**
 * 週次ダイジェスト手動生成（ローカル検証用）
 */
export const generateWeeklyDigestManual = inngest.createFunction(
  {
    id: "generate-weekly-digest-manual",
    retries: 1,
    concurrency: { limit: 1, key: "event.data.userId" },
  },
  { event: "digests/generate-weekly.requested" },
  async ({ event, step, logger }) =>
    runWeeklyDigest({
      step,
      logger,
      targetUserId: event.data.userId,
      periodStartJstDate: event.data.periodStart,
    })
)
