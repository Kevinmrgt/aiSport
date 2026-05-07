CREATE TABLE "session_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"source_type" text NOT NULL,
	"workout_id" uuid,
	"program_id" uuid,
	"program_week_number" integer,
	"program_session_number" integer,
	"title" text NOT NULL,
	"sport" text NOT NULL,
	"difficulty" text NOT NULL,
	"planned_duration_minutes" integer NOT NULL,
	"completed_at" timestamp with time zone NOT NULL,
	"duration_seconds" integer NOT NULL,
	"perceived_effort" integer NOT NULL,
	"feedback" text NOT NULL,
	"pain_notes" text,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "session_logs" ADD CONSTRAINT "session_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "session_logs" ADD CONSTRAINT "session_logs_workout_id_workouts_id_fk" FOREIGN KEY ("workout_id") REFERENCES "public"."workouts"("id") ON DELETE set null ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "session_logs" ADD CONSTRAINT "session_logs_program_id_training_programs_id_fk" FOREIGN KEY ("program_id") REFERENCES "public"."training_programs"("id") ON DELETE set null ON UPDATE no action;
