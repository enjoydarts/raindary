import {
  pgTable,
  text,
  uuid,
  bigint,
  timestamp,
  integer,
  jsonb,
  decimal,
  uniqueIndex,
  index,
  primaryKey,
} from "drizzle-orm/pg-core"
import { relations } from "drizzle-orm"

/**
 * ユーザーテーブル
 * NextAuth (Auth.js) 標準スキーマ + カスタムフィールド
 */
export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("emailVerified", { mode: "date", withTimezone: true }),
  image: text("image"),
  // カスタムフィールド: Raindropトークン（暗号化済み）
  raindropAccessToken: text("raindrop_access_token"),
  raindropRefreshToken: text("raindrop_refresh_token"),
  raindropTokenExpiresAt: timestamp("raindrop_token_expires_at", {
    withTimezone: true,
  }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
})

/**
 * アカウントテーブル
 * NextAuth (Auth.js) 標準スキーマ - OAuth接続情報
 */
export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => ({
    compoundKey: primaryKey({
      columns: [table.provider, table.providerAccountId],
    }),
  })
)

/**
 * セッションテーブル
 * NextAuth (Auth.js) 標準スキーマ - データベースセッション
 */
export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull(),
})

/**
 * 検証トークンテーブル
 * NextAuth (Auth.js) 標準スキーマ
 */
export const verificationTokens = pgTable(
  "verification_token",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date", withTimezone: true }).notNull(),
  },
  (table) => ({
    compoundKey: primaryKey({ columns: [table.identifier, table.token] }),
  })
)

/**
 * Raindrop記事テーブル
 * Raindrop.ioから取り込んだ記事を保存
 */
export const raindrops = pgTable(
  "raindrops",
  {
    id: bigint("id", { mode: "number" }).notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    link: text("link").notNull(),
    excerpt: text("excerpt"),
    cover: text("cover"),
    collectionId: bigint("collection_id", { mode: "number" }),
    tags: jsonb("tags").default([]).notNull(),
    createdAtRemote: timestamp("created_at_remote", { withTimezone: true }).notNull(),
    syncedAt: timestamp("synced_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    // 主キー: user_id + id の複合
    pk: primaryKey({ columns: [table.userId, table.id] }),
    // インデックス
    userIdIdx: index("idx_raindrops_user_id").on(table.userId),
    syncedAtIdx: index("idx_raindrops_synced_at").on(table.userId, table.syncedAt),
    collectionIdx: index("idx_raindrops_collection").on(
      table.userId,
      table.collectionId
    ),
    // tagsはGINインデックス（PostgreSQL拡張が必要）
  })
)

/**
 * 要約テーブル
 * Claude APIで生成した要約を保存
 */
export const summaries = pgTable(
  "summaries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    raindropId: bigint("raindrop_id", { mode: "number" }).notNull(),
    tone: text("tone").notNull(), // 'snarky', 'neutral', 'enthusiastic', 'casual'
    summary: text("summary").notNull(),
    rating: integer("rating"), // 1-5
    ratingReason: text("rating_reason"),
    factsJson: jsonb("facts_json"), // Step1の事実抽出結果
    model: text("model").notNull(), // 使用モデル
    status: text("status").notNull().default("pending"), // 'pending', 'processing', 'completed', 'failed'
    error: text("error"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    // ユニーク制約: user_id + raindrop_id + tone
    uniqueUserRaindropTone: uniqueIndex("unique_user_raindrop_tone").on(
      table.userId,
      table.raindropId,
      table.tone
    ),
    // インデックス
    userRaindropIdx: index("idx_summaries_user_raindrop").on(
      table.userId,
      table.raindropId
    ),
    statusIdx: index("idx_summaries_status").on(table.userId, table.status),
    createdIdx: index("idx_summaries_created").on(table.userId, table.createdAt),
  })
)

/**
 * API使用状況テーブル
 * コスト追跡のためのAPI呼び出し記録
 */
export const apiUsage = pgTable(
  "api_usage",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    summaryId: uuid("summary_id").references(() => summaries.id, {
      onDelete: "set null",
    }),
    apiProvider: text("api_provider").notNull(), // 'anthropic', 'raindrop', 'extract'
    model: text("model"),
    inputTokens: integer("input_tokens"),
    outputTokens: integer("output_tokens"),
    costUsd: decimal("cost_usd", { precision: 10, scale: 6 }), // ドル単位
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    // インデックス
    userIdx: index("idx_api_usage_user").on(table.userId, table.createdAt),
  })
)

/**
 * リレーション定義
 */
export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  sessions: many(sessions),
  raindrops: many(raindrops),
  summaries: many(summaries),
  apiUsage: many(apiUsage),
}))

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}))

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}))

export const raindropsRelations = relations(raindrops, ({ one, many }) => ({
  user: one(users, {
    fields: [raindrops.userId],
    references: [users.id],
  }),
  summaries: many(summaries),
}))

export const summariesRelations = relations(summaries, ({ one, many }) => ({
  user: one(users, {
    fields: [summaries.userId],
    references: [users.id],
  }),
  apiUsage: many(apiUsage),
}))

export const apiUsageRelations = relations(apiUsage, ({ one }) => ({
  user: one(users, {
    fields: [apiUsage.userId],
    references: [users.id],
  }),
  summary: one(summaries, {
    fields: [apiUsage.summaryId],
    references: [summaries.id],
  }),
}))

/**
 * 型エクスポート
 */
export type User = typeof users.$inferSelect
export type NewUser = typeof users.$inferInsert

export type Account = typeof accounts.$inferSelect
export type NewAccount = typeof accounts.$inferInsert

export type Session = typeof sessions.$inferSelect
export type NewSession = typeof sessions.$inferInsert

export type Raindrop = typeof raindrops.$inferSelect
export type NewRaindrop = typeof raindrops.$inferInsert

export type Summary = typeof summaries.$inferSelect
export type NewSummary = typeof summaries.$inferInsert

export type ApiUsage = typeof apiUsage.$inferSelect
export type NewApiUsage = typeof apiUsage.$inferInsert
