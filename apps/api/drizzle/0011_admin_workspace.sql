ALTER TABLE users ADD COLUMN suspended_at timestamptz;
--> statement-breakpoint
CREATE TABLE admin_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_email text NOT NULL,
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  target_email text,
  action text NOT NULL,
  reason text NOT NULL,
  changes jsonb NOT NULL DEFAULT '{}'::jsonb,
  request_key text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE INDEX admin_audit_created_idx ON admin_audit_events(created_at,id);
CREATE INDEX admin_audit_user_created_idx ON admin_audit_events(user_id,created_at);
--> statement-breakpoint
CREATE TABLE admin_tracking (
  id text PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
  started_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO admin_tracking(id) VALUES ('default');
--> statement-breakpoint
INSERT INTO admin_audit_events(id,actor_email,user_id,target_email,action,reason,changes,created_at)
SELECT a.id,a.admin_email,a.beta_user_id,u.email,'beta.credits','Ajustement bêta historique',
  jsonb_build_object('amount',a.amount,'balanceAfter',a.balance_after),a.created_at
FROM beta_credit_adjustments a JOIN users u ON u.id=a.beta_user_id;
