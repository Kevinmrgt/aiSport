CREATE TABLE "admin_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_email" text NOT NULL,
	"user_id" uuid,
	"target_email" text,
	"action" text NOT NULL,
	"reason" text NOT NULL,
	"changes" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"request_key" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_audit_events_request_key_unique" UNIQUE("request_key")
);
--> statement-breakpoint
CREATE TABLE "admin_tracking" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"started_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_tracking_id_check" CHECK ("admin_tracking"."id" = 'default')
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
CREATE TABLE "beta_testers" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"password_hash" text NOT NULL,
	"generation_balance" integer DEFAULT 0 NOT NULL,
	"active" integer DEFAULT 1 NOT NULL,
	"must_change_password" integer DEFAULT 1 NOT NULL,
	"session_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "beta_testers_generation_balance_nonnegative" CHECK ("beta_testers"."generation_balance" >= 0),
	CONSTRAINT "beta_testers_active_boolean" CHECK ("beta_testers"."active" IN (0, 1)),
	CONSTRAINT "beta_testers_must_change_password_boolean" CHECK ("beta_testers"."must_change_password" IN (0, 1))
);
--> statement-breakpoint
CREATE TABLE "billing_accounts" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"stripe_customer_id" text,
	"checkout_session_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_accounts_stripe_customer_id_unique" UNIQUE("stripe_customer_id")
);
--> statement-breakpoint
CREATE TABLE "billing_credit_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"source_key" text NOT NULL,
	"subscription_id" text,
	"amount" integer NOT NULL,
	"remaining" integer NOT NULL,
	"starts_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone,
	CONSTRAINT "billing_credit_grants_source_key_unique" UNIQUE("source_key"),
	CONSTRAINT "billing_credit_grants_amount_check" CHECK ("billing_credit_grants"."amount">0),
	CONSTRAINT "billing_credit_grants_remaining_check" CHECK ("billing_credit_grants"."remaining">=0 AND "billing_credit_grants"."remaining"<="billing_credit_grants"."amount"),
	CONSTRAINT "billing_credit_grants_check" CHECK ("billing_credit_grants"."expires_at" IS NULL OR "billing_credit_grants"."expires_at">"billing_credit_grants"."starts_at")
);
--> statement-breakpoint
CREATE TABLE "billing_credit_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"allocations" jsonb NOT NULL,
	"state" text DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "billing_credit_reservations_state_check" CHECK ("billing_credit_reservations"."state" IN ('pending','committed','released'))
);
--> statement-breakpoint
CREATE TABLE "billing_subscriptions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"status" text NOT NULL,
	"period_end" timestamp with time zone NOT NULL,
	"cancel_at_period_end" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "billing_webhook_events" (
	"id" text PRIMARY KEY NOT NULL,
	"processed_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "page_visits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_settings" (
	"id" text PRIMARY KEY DEFAULT 'default' NOT NULL,
	"default_ai_model" text DEFAULT 'gpt-5.4-mini' NOT NULL,
	"default_beta_generation_balance" integer DEFAULT 10 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "platform_settings_singleton" CHECK ("platform_settings"."id" = 'default'),
	CONSTRAINT "platform_settings_default_beta_generation_balance_range" CHECK ("platform_settings"."default_beta_generation_balance" BETWEEN 1 AND 10000)
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "suspended_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "admin_audit_events" ADD CONSTRAINT "admin_audit_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beta_credit_adjustments" ADD CONSTRAINT "beta_credit_adjustments_beta_user_id_beta_testers_user_id_fk" FOREIGN KEY ("beta_user_id") REFERENCES "public"."beta_testers"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "beta_testers" ADD CONSTRAINT "beta_testers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_accounts" ADD CONSTRAINT "billing_accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_credit_grants" ADD CONSTRAINT "billing_credit_grants_user_id_billing_accounts_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."billing_accounts"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_credit_grants" ADD CONSTRAINT "billing_credit_grants_subscription_id_billing_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "public"."billing_subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_credit_reservations" ADD CONSTRAINT "billing_credit_reservations_user_id_billing_accounts_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."billing_accounts"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "billing_subscriptions" ADD CONSTRAINT "billing_subscriptions_user_id_billing_accounts_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."billing_accounts"("user_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "admin_audit_created_idx" ON "admin_audit_events" USING btree ("created_at","id");--> statement-breakpoint
CREATE INDEX "admin_audit_user_created_idx" ON "admin_audit_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "beta_credit_adjustments_beta_created_idx" ON "beta_credit_adjustments" USING btree ("beta_user_id","created_at");--> statement-breakpoint
CREATE INDEX "billing_credit_grants_user_idx" ON "billing_credit_grants" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "billing_reservations_user_idx" ON "billing_credit_reservations" USING btree ("user_id","state");--> statement-breakpoint
CREATE INDEX "billing_subscriptions_user_idx" ON "billing_subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "page_visits_occurred_idx" ON "page_visits" USING btree ("occurred_at");