CREATE INDEX IF NOT EXISTS "workouts_user_created_idx" ON "workouts" USING btree ("user_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "training_programs_user_created_idx" ON "training_programs" USING btree ("user_id", "created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "session_logs_user_completed_idx" ON "session_logs" USING btree ("user_id", "completed_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "session_logs_workout_idx" ON "session_logs" USING btree ("workout_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "session_logs_program_idx" ON "session_logs" USING btree ("program_id");
