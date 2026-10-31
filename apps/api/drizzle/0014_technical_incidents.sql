CREATE TABLE "incidents" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"fingerprint" text NOT NULL,
	"source" text NOT NULL,
	"severity" text NOT NULL,
	"code" text NOT NULL,
	"route" text NOT NULL,
	"method" text NOT NULL,
	"status_code" integer,
	"last_request_id" uuid,
	"occurrence_count" integer DEFAULT 1 NOT NULL,
	"first_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_seen_at" timestamp with time zone DEFAULT now() NOT NULL,
	"status" text DEFAULT 'new' NOT NULL,
	CONSTRAINT "incidents_fingerprint_unique" UNIQUE("fingerprint"),
	CONSTRAINT "incidents_source_check" CHECK ("incidents"."source" IN ('api','ai','web')),
	CONSTRAINT "incidents_severity_check" CHECK ("incidents"."severity" IN ('warning','error','critical')),
	CONSTRAINT "incidents_status_check" CHECK ("incidents"."status" IN ('new','in_progress','resolved')),
	CONSTRAINT "incidents_count_check" CHECK ("incidents"."occurrence_count" > 0)
);
--> statement-breakpoint
CREATE INDEX "incidents_last_seen_idx" ON "incidents" USING btree ("last_seen_at");--> statement-breakpoint
CREATE INDEX "incidents_status_last_seen_idx" ON "incidents" USING btree ("status","last_seen_at");