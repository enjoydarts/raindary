-- NextAuth.js移行: 既存データをクリアして新規作成

-- 既存テーブルを削除（依存関係の順序で）
DROP TABLE IF EXISTS "api_usage" CASCADE;
DROP TABLE IF EXISTS "summaries" CASCADE;
DROP TABLE IF EXISTS "raindrops" CASCADE;
DROP TABLE IF EXISTS "session" CASCADE;
DROP TABLE IF EXISTS "account" CASCADE;
DROP TABLE IF EXISTS "user" CASCADE;
DROP TABLE IF EXISTS "verification_token" CASCADE;

-- NextAuth標準テーブル: user
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"email" text NOT NULL UNIQUE,
	"emailVerified" timestamp with time zone,
	"image" text,
	"raindrop_access_token" text,
	"raindrop_refresh_token" text,
	"raindrop_token_expires_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- NextAuth標準テーブル: account
CREATE TABLE "account" (
	"userId" text NOT NULL,
	"type" text NOT NULL,
	"provider" text NOT NULL,
	"providerAccountId" text NOT NULL,
	"refresh_token" text,
	"access_token" text,
	"expires_at" integer,
	"token_type" text,
	"scope" text,
	"id_token" text,
	"session_state" text,
	PRIMARY KEY("provider", "providerAccountId"),
	CONSTRAINT "account_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE cascade ON UPDATE no action
);

-- NextAuth標準テーブル: session
CREATE TABLE "session" (
	"sessionToken" text PRIMARY KEY NOT NULL,
	"userId" text NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	CONSTRAINT "session_userId_user_id_fk" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE cascade ON UPDATE no action
);

-- NextAuth標準テーブル: verification_token
CREATE TABLE "verification_token" (
	"identifier" text NOT NULL,
	"token" text NOT NULL,
	"expires" timestamp with time zone NOT NULL,
	PRIMARY KEY("identifier", "token")
);

-- アプリケーションテーブル: raindrops
CREATE TABLE "raindrops" (
	"id" bigint NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"link" text NOT NULL,
	"excerpt" text,
	"cover" text,
	"collection_id" bigint,
	"tags" jsonb DEFAULT '[]' NOT NULL,
	"created_at_remote" timestamp with time zone NOT NULL,
	"synced_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	PRIMARY KEY("user_id", "id"),
	CONSTRAINT "raindrops_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade ON UPDATE no action
);

CREATE INDEX "idx_raindrops_user_id" ON "raindrops" USING btree ("user_id");
CREATE INDEX "idx_raindrops_synced_at" ON "raindrops" USING btree ("user_id", "synced_at");
CREATE INDEX "idx_raindrops_collection" ON "raindrops" USING btree ("user_id", "collection_id");

-- アプリケーションテーブル: summaries
CREATE TABLE "summaries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"raindrop_id" bigint NOT NULL,
	"tone" text NOT NULL,
	"summary" text NOT NULL,
	"rating" integer,
	"rating_reason" text,
	"facts_json" jsonb,
	"model" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "summaries_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade ON UPDATE no action
);

CREATE UNIQUE INDEX "unique_user_raindrop_tone" ON "summaries" USING btree ("user_id", "raindrop_id", "tone");
CREATE INDEX "idx_summaries_user_raindrop" ON "summaries" USING btree ("user_id", "raindrop_id");
CREATE INDEX "idx_summaries_status" ON "summaries" USING btree ("user_id", "status");
CREATE INDEX "idx_summaries_created" ON "summaries" USING btree ("user_id", "created_at");

-- アプリケーションテーブル: api_usage
CREATE TABLE "api_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text NOT NULL,
	"summary_id" uuid,
	"api_provider" text NOT NULL,
	"model" text,
	"input_tokens" integer,
	"output_tokens" integer,
	"cost_usd" numeric(10, 6),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "api_usage_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE cascade ON UPDATE no action,
	CONSTRAINT "api_usage_summary_id_summaries_id_fk" FOREIGN KEY ("summary_id") REFERENCES "summaries"("id") ON DELETE set null ON UPDATE no action
);

CREATE INDEX "idx_api_usage_user" ON "api_usage" USING btree ("user_id", "created_at");
