-- Row Level Security (RLS) の有効化と設定
-- SupabaseでPostgreSQLレベルのアクセス制御を実現

-- ========================================
-- 1. RLSの有効化
-- ========================================

-- すべてのテーブルでRLSを有効化
ALTER TABLE "user" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "raindrops" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "summaries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "api_usage" ENABLE ROW LEVEL SECURITY;

-- ========================================
-- 2. ヘルパー関数: 現在のユーザーIDを取得
-- ========================================

-- Auth.jsのセッションから現在のユーザーIDを取得する関数
CREATE OR REPLACE FUNCTION public.current_user_id()
RETURNS TEXT AS $$
  -- セッション変数から取得（アプリケーションで設定）
  SELECT current_setting('app.current_user_id', true);
$$ LANGUAGE SQL STABLE;

-- ========================================
-- 3. Users テーブルのポリシー
-- ========================================

-- 自分のユーザー情報のみ読み取り可能
CREATE POLICY "Users can view own data"
  ON "user"
  FOR SELECT
  USING (id = public.current_user_id());

-- 自分のユーザー情報のみ更新可能
CREATE POLICY "Users can update own data"
  ON "user"
  FOR UPDATE
  USING (id = public.current_user_id());

-- ========================================
-- 4. Accounts テーブルのポリシー
-- ========================================

-- 自分のアカウント情報のみ読み取り可能
CREATE POLICY "Users can view own accounts"
  ON "account"
  FOR SELECT
  USING ("userId" = public.current_user_id());

-- 自分のアカウント情報のみ更新可能
CREATE POLICY "Users can update own accounts"
  ON "account"
  FOR UPDATE
  USING ("userId" = public.current_user_id());

-- 自分のアカウント情報のみ削除可能
CREATE POLICY "Users can delete own accounts"
  ON "account"
  FOR DELETE
  USING ("userId" = public.current_user_id());

-- ========================================
-- 5. Sessions テーブルのポリシー
-- ========================================

-- 自分のセッション情報のみ読み取り可能
CREATE POLICY "Users can view own sessions"
  ON "session"
  FOR SELECT
  USING ("userId" = public.current_user_id());

-- 自分のセッション情報のみ更新可能
CREATE POLICY "Users can update own sessions"
  ON "session"
  FOR UPDATE
  USING ("userId" = public.current_user_id());

-- 自分のセッション情報のみ削除可能
CREATE POLICY "Users can delete own sessions"
  ON "session"
  FOR DELETE
  USING ("userId" = public.current_user_id());

-- ========================================
-- 6. Raindrops テーブルのポリシー
-- ========================================

-- 自分の記事のみ読み取り可能
CREATE POLICY "Users can view own raindrops"
  ON "raindrops"
  FOR SELECT
  USING ("user_id" = public.current_user_id());

-- 自分の記事のみ挿入可能
CREATE POLICY "Users can insert own raindrops"
  ON "raindrops"
  FOR INSERT
  WITH CHECK ("user_id" = public.current_user_id());

-- 自分の記事のみ更新可能
CREATE POLICY "Users can update own raindrops"
  ON "raindrops"
  FOR UPDATE
  USING ("user_id" = public.current_user_id());

-- 自分の記事のみ削除可能（ソフトデリート用）
CREATE POLICY "Users can delete own raindrops"
  ON "raindrops"
  FOR UPDATE
  USING ("user_id" = public.current_user_id());

-- ========================================
-- 7. Summaries テーブルのポリシー
-- ========================================

-- 自分の要約、または公開されている要約を読み取り可能
CREATE POLICY "Users can view own or public summaries"
  ON "summaries"
  FOR SELECT
  USING (
    "user_id" = public.current_user_id()
    OR "is_public" = 1
  );

-- 自分の要約のみ挿入可能
CREATE POLICY "Users can insert own summaries"
  ON "summaries"
  FOR INSERT
  WITH CHECK ("user_id" = public.current_user_id());

-- 自分の要約のみ更新可能
CREATE POLICY "Users can update own summaries"
  ON "summaries"
  FOR UPDATE
  USING ("user_id" = public.current_user_id());

-- 自分の要約のみ削除可能
CREATE POLICY "Users can delete own summaries"
  ON "summaries"
  FOR DELETE
  USING ("user_id" = public.current_user_id());

-- ========================================
-- 8. API Usage テーブルのポリシー
-- ========================================

-- 自分のAPI使用状況のみ読み取り可能
CREATE POLICY "Users can view own api usage"
  ON "api_usage"
  FOR SELECT
  USING ("user_id" = public.current_user_id());

-- 自分のAPI使用状況のみ挿入可能
CREATE POLICY "Users can insert own api usage"
  ON "api_usage"
  FOR INSERT
  WITH CHECK ("user_id" = public.current_user_id());

-- ========================================
-- 9. サービスロール用のポリシー
-- ========================================

-- サービスロール（Inngest等のバックグラウンドジョブ）は
-- すべてのデータにアクセス可能
-- これはSupabaseのサービスロールキーを使用する場合に有効

COMMENT ON POLICY "Users can view own data" ON "user" IS
  'RLS: Users can only view their own user data';
COMMENT ON POLICY "Users can view own raindrops" ON "raindrops" IS
  'RLS: Users can only view their own imported articles';
COMMENT ON POLICY "Users can view own or public summaries" ON "summaries" IS
  'RLS: Users can view their own summaries or public summaries';
