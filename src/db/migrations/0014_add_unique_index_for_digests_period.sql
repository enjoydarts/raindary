-- 同一ユーザー・同一期間のダイジェスト重複を解消し、以後は一意制約で防止する
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY user_id, period, period_start, period_end
      ORDER BY created_at DESC, id DESC
    ) AS rn
  FROM digests
)
DELETE FROM digests d
USING ranked r
WHERE d.id = r.id
  AND r.rn > 1;

CREATE UNIQUE INDEX IF NOT EXISTS "digests_unique_period_idx"
ON "digests" ("user_id", "period", "period_start", "period_end");
