-- Convert embedding column from jsonb to vector type
-- Step 1: Add new vector column
ALTER TABLE summaries ADD COLUMN embedding_vector vector(1536);

-- Step 2: Convert existing jsonb embeddings to vector
-- Only convert non-null embeddings that are arrays
UPDATE summaries
SET embedding_vector = (
  SELECT ('[' || string_agg(value::text, ',') || ']')::vector
  FROM jsonb_array_elements(embedding) AS value
)
WHERE embedding IS NOT NULL
  AND jsonb_typeof(embedding) = 'array';

-- Step 3: Drop old jsonb column and rename new column
ALTER TABLE summaries DROP COLUMN embedding;
ALTER TABLE summaries RENAME COLUMN embedding_vector TO embedding;

-- Step 4: Create index for vector similarity search (cosine distance)
-- Using HNSW index (better memory efficiency and accuracy than ivfflat)
CREATE INDEX IF NOT EXISTS idx_summaries_embedding_hnsw
  ON summaries USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Note: ivfflat alternative (uses more memory):
-- CREATE INDEX idx_summaries_embedding_cosine
--   ON summaries USING ivfflat (embedding vector_cosine_ops)
--   WITH (lists = 100);
