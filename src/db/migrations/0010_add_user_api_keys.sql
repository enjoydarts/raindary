-- Add encrypted user-specific API key columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user' AND column_name = 'anthropic_api_key_encrypted'
  ) THEN
    ALTER TABLE "user" ADD COLUMN anthropic_api_key_encrypted text;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user' AND column_name = 'openai_api_key_encrypted'
  ) THEN
    ALTER TABLE "user" ADD COLUMN openai_api_key_encrypted text;
  END IF;
END $$;
