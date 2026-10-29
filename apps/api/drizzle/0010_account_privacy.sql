CREATE TABLE "account_revocations" (
	"subject_hash" text PRIMARY KEY NOT NULL,
	"revoked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE INDEX "account_revocations_expires_idx" ON "account_revocations" USING btree ("expires_at");