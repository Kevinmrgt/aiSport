CREATE TABLE "generation_control" (
	"id" text PRIMARY KEY DEFAULT 'global' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "generation_control_global_check" CHECK ("generation_control"."id" = 'global')
);
--> statement-breakpoint
CREATE TABLE "generation_daily_budgets" (
	"scope" text NOT NULL,
	"day" date NOT NULL,
	"user_id" uuid,
	"attempts" integer DEFAULT 0 NOT NULL,
	"reserved_tokens" integer DEFAULT 0 NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "generation_daily_budgets_scope_day_pk" PRIMARY KEY("scope","day"),
	CONSTRAINT "generation_daily_budgets_scope_check" CHECK (("generation_daily_budgets"."scope" = 'global' and "generation_daily_budgets"."user_id" is null) or "generation_daily_budgets"."scope" = 'user:' || "generation_daily_budgets"."user_id"::text),
	CONSTRAINT "generation_daily_budgets_counters_check" CHECK ("generation_daily_budgets"."attempts" >= 0 and "generation_daily_budgets"."reserved_tokens" >= 0 and "generation_daily_budgets"."input_tokens" >= 0 and "generation_daily_budgets"."output_tokens" >= 0)
);
--> statement-breakpoint
CREATE TABLE "generation_operations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"operation_key" uuid NOT NULL,
	"kind" text NOT NULL,
	"input_hash" text NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"resource_id" uuid NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"reserved_tokens" integer DEFAULT 0 NOT NULL,
	"input_tokens" integer DEFAULT 0 NOT NULL,
	"output_tokens" integer DEFAULT 0 NOT NULL,
	"lease_expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "generation_operations_kind_check" CHECK ("generation_operations"."kind" in ('workout', 'program')),
	CONSTRAINT "generation_operations_status_check" CHECK ("generation_operations"."status" in ('running', 'succeeded', 'failed')),
	CONSTRAINT "generation_operations_counters_check" CHECK ("generation_operations"."attempts" >= 0 and "generation_operations"."reserved_tokens" >= 0 and "generation_operations"."input_tokens" >= 0 and "generation_operations"."output_tokens" >= 0),
	CONSTRAINT "generation_operations_hash_check" CHECK ("generation_operations"."input_hash" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
CREATE TABLE "generation_usage_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operation_id" uuid NOT NULL,
	"event_key" text NOT NULL,
	"model" text NOT NULL,
	"input_tokens" integer NOT NULL,
	"output_tokens" integer NOT NULL,
	"total_tokens" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "generation_usage_events_tokens_check" CHECK ("generation_usage_events"."input_tokens" >= 0 and "generation_usage_events"."output_tokens" >= 0 and "generation_usage_events"."total_tokens" >= "generation_usage_events"."input_tokens" + "generation_usage_events"."output_tokens")
);
--> statement-breakpoint
ALTER TABLE "generation_daily_budgets" ADD CONSTRAINT "generation_daily_budgets_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_operations" ADD CONSTRAINT "generation_operations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generation_usage_events" ADD CONSTRAINT "generation_usage_events_operation_id_generation_operations_id_fk" FOREIGN KEY ("operation_id") REFERENCES "public"."generation_operations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "generation_daily_budgets_user_idx" ON "generation_daily_budgets" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "generation_operations_user_key_uidx" ON "generation_operations" USING btree ("user_id","operation_key");--> statement-breakpoint
CREATE INDEX "generation_operations_active_idx" ON "generation_operations" USING btree ("status","lease_expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "generation_usage_events_operation_key_uidx" ON "generation_usage_events" USING btree ("operation_id","event_key");