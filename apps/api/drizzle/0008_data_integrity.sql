CREATE INDEX "session_logs_user_completed_id_idx" ON "session_logs" USING btree ("user_id","completed_at","id");--> statement-breakpoint
CREATE INDEX "training_programs_user_created_id_idx" ON "training_programs" USING btree ("user_id","created_at","id");--> statement-breakpoint
CREATE INDEX "workouts_user_created_id_idx" ON "workouts" USING btree ("user_id","created_at","id");--> statement-breakpoint
ALTER TABLE "session_logs" ADD CONSTRAINT "session_logs_difficulty_valid" CHECK ("session_logs"."difficulty" in ('beginner','intermediate','advanced')) NOT VALID;--> statement-breakpoint
ALTER TABLE "session_logs" ADD CONSTRAINT "session_logs_feedback_valid" CHECK ("session_logs"."feedback" in ('too_easy','good','too_hard')) NOT VALID;--> statement-breakpoint
ALTER TABLE "session_logs" ADD CONSTRAINT "session_logs_source_valid" CHECK ("session_logs"."source_type" in ('workout','program_session')) NOT VALID;--> statement-breakpoint
ALTER TABLE "session_logs" ADD CONSTRAINT "session_logs_effort_valid" CHECK ("session_logs"."perceived_effort" between 1 and 10) NOT VALID;--> statement-breakpoint
ALTER TABLE "session_logs" ADD CONSTRAINT "session_logs_duration_valid" CHECK ("session_logs"."duration_seconds" >= 0 and "session_logs"."planned_duration_minutes" > 0) NOT VALID;--> statement-breakpoint
ALTER TABLE "training_programs" ADD CONSTRAINT "training_programs_difficulty_valid" CHECK ("training_programs"."difficulty" in ('beginner','intermediate','advanced')) NOT VALID;--> statement-breakpoint
ALTER TABLE "training_programs" ADD CONSTRAINT "training_programs_counts_valid" CHECK ("training_programs"."weeks_count" between 2 and 4 and "training_programs"."sessions_per_week" between 2 and 5) NOT VALID;--> statement-breakpoint
ALTER TABLE "training_programs" ADD CONSTRAINT "training_programs_duration_valid" CHECK ("training_programs"."session_duration_minutes" between 20 and 60) NOT VALID;--> statement-breakpoint
ALTER TABLE "training_programs" ADD CONSTRAINT "training_programs_data_object" CHECK (jsonb_typeof("training_programs"."data") = 'object' and "training_programs"."data" ? 'weeks') NOT VALID;--> statement-breakpoint
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_difficulty_valid" CHECK ("workouts"."difficulty" in ('beginner','intermediate','advanced')) NOT VALID;--> statement-breakpoint
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_duration_positive" CHECK ("workouts"."duration_minutes" > 0 and "workouts"."duration_minutes" <= 180) NOT VALID;--> statement-breakpoint
ALTER TABLE "workouts" ADD CONSTRAINT "workouts_data_object" CHECK (jsonb_typeof("workouts"."data") = 'object' and "workouts"."data" ? 'exercises') NOT VALID;