-- Row Level Security (RLS) ポリシー
-- 注意: DATABASE_URLでpostgresユーザー（スーパーユーザー）を使用している場合は不要
-- poolerや別のユーザーを使用している場合のみ実行してください

-- user テーブル: 自分のレコードのみアクセス可能
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own data"
  ON "user"
  FOR SELECT
  USING (id = current_setting('app.user_id', true));

CREATE POLICY "Users can update own data"
  ON "user"
  FOR UPDATE
  USING (id = current_setting('app.user_id', true));

-- account テーブル: 自分のアカウントのみアクセス可能
ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own accounts"
  ON "account"
  FOR SELECT
  USING ("userId" = current_setting('app.user_id', true));

CREATE POLICY "Users can insert own accounts"
  ON "account"
  FOR INSERT
  WITH CHECK ("userId" = current_setting('app.user_id', true));

CREATE POLICY "Users can update own accounts"
  ON "account"
  FOR UPDATE
  USING ("userId" = current_setting('app.user_id', true));

CREATE POLICY "Users can delete own accounts"
  ON "account"
  FOR DELETE
  USING ("userId" = current_setting('app.user_id', true));

-- session テーブル: 自分のセッションのみアクセス可能
ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own sessions"
  ON "session"
  FOR SELECT
  USING ("userId" = current_setting('app.user_id', true));

CREATE POLICY "Users can insert own sessions"
  ON "session"
  FOR INSERT
  WITH CHECK ("userId" = current_setting('app.user_id', true));

CREATE POLICY "Users can delete own sessions"
  ON "session"
  FOR DELETE
  USING ("userId" = current_setting('app.user_id', true));

-- verification_token テーブル: 全ユーザーがアクセス可能（メール認証用）
ALTER TABLE "verification_token" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read verification tokens"
  ON "verification_token"
  FOR SELECT
  USING (true);

CREATE POLICY "Anyone can insert verification tokens"
  ON "verification_token"
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Anyone can delete verification tokens"
  ON "verification_token"
  FOR DELETE
  USING (true);

-- raindrops テーブル: 自分の記事のみアクセス可能
ALTER TABLE "raindrops" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own raindrops"
  ON "raindrops"
  FOR SELECT
  USING (user_id = current_setting('app.user_id', true));

CREATE POLICY "Users can insert own raindrops"
  ON "raindrops"
  FOR INSERT
  WITH CHECK (user_id = current_setting('app.user_id', true));

CREATE POLICY "Users can update own raindrops"
  ON "raindrops"
  FOR UPDATE
  USING (user_id = current_setting('app.user_id', true));

-- summaries テーブル: 自分の要約のみアクセス可能
ALTER TABLE "summaries" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own summaries"
  ON "summaries"
  FOR SELECT
  USING (user_id = current_setting('app.user_id', true));

CREATE POLICY "Users can insert own summaries"
  ON "summaries"
  FOR INSERT
  WITH CHECK (user_id = current_setting('app.user_id', true));

CREATE POLICY "Users can update own summaries"
  ON "summaries"
  FOR UPDATE
  USING (user_id = current_setting('app.user_id', true));

-- api_usage テーブル: 自分の使用履歴のみアクセス可能
ALTER TABLE "api_usage" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own api usage"
  ON "api_usage"
  FOR SELECT
  USING (user_id = current_setting('app.user_id', true));

CREATE POLICY "Users can insert own api usage"
  ON "api_usage"
  FOR INSERT
  WITH CHECK (user_id = current_setting('app.user_id', true));
