CREATE TABLE "generation_quotas" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"used_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "generation_quotas_used_count_nonnegative" CHECK ("generation_quotas"."used_count" >= 0)
);
--> statement-breakpoint
ALTER TABLE "generation_quotas" ADD CONSTRAINT "generation_quotas_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
