-- Add theme column for automatic categorization
ALTER TABLE summaries ADD COLUMN theme text;

-- Create index for theme filtering
CREATE INDEX IF NOT EXISTS idx_summaries_theme ON summaries(user_id, theme) WHERE theme IS NOT NULL;
