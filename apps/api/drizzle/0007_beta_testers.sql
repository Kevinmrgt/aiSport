CREATE TABLE "beta_testers" (
  "user_id" uuid PRIMARY KEY NOT NULL,
  "password_hash" text NOT NULL,
  "generation_balance" integer DEFAULT 0 NOT NULL,
  "active" integer DEFAULT 1 NOT NULL,
  "must_change_password" integer DEFAULT 1 NOT NULL,
  "session_version" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "beta_testers_generation_balance_nonnegative" CHECK ("generation_balance" >= 0),
  CONSTRAINT "beta_testers_active_boolean" CHECK ("active" IN (0, 1)),
  CONSTRAINT "beta_testers_must_change_password_boolean" CHECK ("must_change_password" IN (0, 1))
);
--> statement-breakpoint
CREATE TABLE "beta_credit_adjustments" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "beta_user_id" uuid NOT NULL,
  "admin_email" text NOT NULL,
  "amount" integer NOT NULL,
  "balance_after" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "beta_testers" ADD CONSTRAINT "beta_testers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "beta_credit_adjustments" ADD CONSTRAINT "beta_credit_adjustments_beta_user_id_beta_testers_user_id_fk" FOREIGN KEY ("beta_user_id") REFERENCES "public"."beta_testers"("user_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "beta_credit_adjustments_beta_created_idx" ON "beta_credit_adjustments" USING btree ("beta_user_id", "created_at");
