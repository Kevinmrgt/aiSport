CREATE TABLE page_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  occurred_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX page_visits_occurred_idx ON page_visits (occurred_at);
