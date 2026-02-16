import { NextResponse } from "next/server"
import { db } from "@/db"
import { sql } from "drizzle-orm"

/**
 * ヘルスチェックエンドポイント
 *
 * 用途:
 * - アプリケーションの稼働状況確認
 * - 外部監視サービス（UptimeRobot, Pingdom等）との連携
 * - デプロイ後の動作確認
 *
 * チェック項目:
 * - Next.jsアプリケーションの起動
 * - データベース接続
 * - 環境変数の設定
 */
export async function GET() {
  const startTime = Date.now()

  try {
    // 1. データベース接続確認
    const dbCheck = await checkDatabase()

    // 2. 環境変数確認
    const envCheck = checkEnvironmentVariables()

    // 3. レスポンス時間計算
    const responseTime = Date.now() - startTime

    // 全てのチェックが成功した場合
    if (dbCheck.healthy && envCheck.healthy) {
      return NextResponse.json(
        {
          status: "healthy",
          timestamp: new Date().toISOString(),
          checks: {
            database: dbCheck,
            environment: envCheck,
          },
          responseTime: `${responseTime}ms`,
        },
        { status: 200 }
      )
    }

    // 一部のチェックが失敗した場合
    return NextResponse.json(
      {
        status: "degraded",
        timestamp: new Date().toISOString(),
        checks: {
          database: dbCheck,
          environment: envCheck,
        },
        responseTime: `${responseTime}ms`,
      },
      { status: 503 }
    )
  } catch (error) {
    // 予期しないエラーが発生した場合
    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
        responseTime: `${Date.now() - startTime}ms`,
      },
      { status: 503 }
    )
  }
}

/**
 * データベース接続確認
 */
async function checkDatabase() {
  try {
    // シンプルなクエリを実行してDB接続を確認
    await db.execute(sql`SELECT 1`)
    return {
      healthy: true,
      message: "Database connection successful",
    }
  } catch (error) {
    return {
      healthy: false,
      message: "Database connection failed",
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

/**
 * 環境変数確認
 */
function checkEnvironmentVariables() {
  const requiredEnvVars = [
    "DATABASE_URL",
    "AUTH_SECRET",
    "NEXTAUTH_URL",
    "ANTHROPIC_API_KEY",
    "INNGEST_EVENT_KEY",
    "INNGEST_SIGNING_KEY",
  ]

  const missingVars = requiredEnvVars.filter((key) => !process.env[key])

  if (missingVars.length === 0) {
    return {
      healthy: true,
      message: "All required environment variables are set",
    }
  }

  return {
    healthy: false,
    message: "Missing required environment variables",
    missing: missingVars,
  }
}
