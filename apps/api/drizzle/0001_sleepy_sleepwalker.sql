CREATE TABLE "training_programs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"sport" text NOT NULL,
	"difficulty" text NOT NULL,
	"weeks_count" integer NOT NULL,
	"sessions_per_week" integer NOT NULL,
	"session_duration_minutes" integer NOT NULL,
	"data" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "training_programs" ADD CONSTRAINT "training_programs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;