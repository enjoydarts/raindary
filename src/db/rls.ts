import { db } from "./index"
import { sql } from "drizzle-orm"
import type { PgTransaction } from "drizzle-orm/pg-core"
import type { PostgresJsDatabase, PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js"
import * as schema from "./schema"

type DbTransaction = PgTransaction<
  PostgresJsQueryResultHKT,
  typeof schema,
  any
>

type DbClient = PostgresJsDatabase<typeof schema>

/**
 * Row Level Security (RLS) 対応のデータベースクエリ実行
 *
 * このヘルパー関数を使うことで、PostgreSQLのRLSポリシーが
 * 自動的に適用され、ユーザーは自分のデータのみアクセス可能になります。
 *
 * @param userId - 現在のユーザーID
 * @param callback - データベースクエリを実行するコールバック関数
 * @returns クエリ結果
 *
 * @example
 * const raindrops = await withRLS(userId, async (tx) => {
 *   return await tx.select().from(raindrops).limit(10)
 * })
 */
export async function withRLS<T>(
  userId: string,
  callback: (tx: DbTransaction) => Promise<T>
): Promise<T> {
  // UUIDフォーマットのバリデーション（SQLインジェクション対策）
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(userId)) {
    throw new Error(`Invalid userId format: ${userId}`)
  }

  return await db.transaction(async (tx) => {
    // セッション変数を設定（RLSポリシーで使用）
    // 注: SET LOCALはプレースホルダーをサポートしないため、
    // UUIDバリデーション後にsql.raw()で安全に使用
    await tx.execute(sql.raw(`SET LOCAL app.current_user_id = '${userId}'`))

    // コールバックを実行
    return await callback(tx)
  })
}

/**
 * サービスロール（バックグラウンドジョブ等）用のクエリ実行
 *
 * RLSをバイパスして、すべてのデータにアクセスします。
 * Inngest関数など、信頼できるサービスからのみ使用してください。
 *
 * ⚠️ 注意: このヘルパーは慎重に使用してください
 *
 * @param callback - データベースクエリを実行するコールバック関数
 * @returns クエリ結果
 */
export async function withServiceRole<T>(
  callback: (db: DbClient) => Promise<T>
): Promise<T> {
  // RLSを無効化（サービスロール権限）
  // 注: 本番環境ではSupabaseのサービスロールキーを使用
  return await callback(db)
}

/**
 * 匿名ユーザー（ログイン不要）用のクエリ実行
 *
 * 公開データ（is_public = 1の要約など）にアクセスする場合に使用
 *
 * @param callback - データベースクエリを実行するコールバック関数
 * @returns クエリ結果
 *
 * @example
 * const publicSummary = await withAnonymous(async (tx) => {
 *   return await tx
 *     .select()
 *     .from(summaries)
 *     .where(and(eq(summaries.id, id), eq(summaries.isPublic, 1)))
 * })
 */
export async function withAnonymous<T>(
  callback: (tx: DbTransaction) => Promise<T>
): Promise<T> {
  return await db.transaction(async (tx) => {
    // 匿名ユーザーとして設定（空文字列）
    // 注: SET LOCALはプレースホルダーをサポートしないため、sql.raw()を使用
    await tx.execute(sql.raw(`SET LOCAL app.current_user_id = ''`))

    return await callback(tx)
  })
}
