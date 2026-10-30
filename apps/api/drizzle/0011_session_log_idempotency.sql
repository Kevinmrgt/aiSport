CREATE TABLE "session_log_operations" (
	"user_id" uuid NOT NULL,
	"operation_key" uuid NOT NULL,
	"input_hash" text NOT NULL,
	"log_id" uuid NOT NULL,
	CONSTRAINT "session_log_operations_user_id_operation_key_pk" PRIMARY KEY("user_id","operation_key")
);
--> statement-breakpoint
ALTER TABLE "session_log_operations" ADD CONSTRAINT "session_log_operations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session_log_operations" ADD CONSTRAINT "session_log_operations_log_id_session_logs_id_fk" FOREIGN KEY ("log_id") REFERENCES "public"."session_logs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "session_log_operations_log_idx" ON "session_log_operations" USING btree ("log_id");