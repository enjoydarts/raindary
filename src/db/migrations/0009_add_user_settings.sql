-- Add account settings columns to users
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user' AND column_name = 'default_summary_tone'
  ) THEN
    ALTER TABLE "user" ADD COLUMN default_summary_tone text NOT NULL DEFAULT 'neutral';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user' AND column_name = 'notifications_enabled'
  ) THEN
    ALTER TABLE "user" ADD COLUMN notifications_enabled integer NOT NULL DEFAULT 1;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user' AND column_name = 'default_import_collection_id'
  ) THEN
    ALTER TABLE "user" ADD COLUMN default_import_collection_id bigint;
  END IF;
END $$;
