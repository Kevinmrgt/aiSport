UPDATE "user_settings"
SET
  "ai_provider" = 'openai',
  "ai_api_key_encrypted" = NULL,
  "updated_at" = now()
WHERE "ai_provider" <> 'openai'
   OR "ai_api_key_encrypted" IS NOT NULL;
--> statement-breakpoint
ALTER TABLE "user_settings" ALTER COLUMN "ai_provider" SET DEFAULT 'openai';
