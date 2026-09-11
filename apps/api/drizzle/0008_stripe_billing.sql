CREATE TABLE billing_accounts (
  user_id uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id text UNIQUE,
  checkout_session_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE billing_subscriptions (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES billing_accounts(user_id) ON DELETE CASCADE,
  status text NOT NULL,
  period_end timestamptz NOT NULL,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX billing_subscriptions_user_idx ON billing_subscriptions(user_id);
--> statement-breakpoint
CREATE TABLE billing_credit_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES billing_accounts(user_id) ON DELETE CASCADE,
  source_key text NOT NULL UNIQUE,
  subscription_id text REFERENCES billing_subscriptions(id),
  amount integer NOT NULL CHECK (amount > 0),
  remaining integer NOT NULL CHECK (remaining >= 0 AND remaining <= amount),
  starts_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  CHECK (expires_at IS NULL OR expires_at > starts_at)
);
CREATE INDEX billing_credit_grants_user_idx ON billing_credit_grants(user_id);
--> statement-breakpoint
CREATE TABLE billing_credit_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES billing_accounts(user_id) ON DELETE CASCADE,
  allocations jsonb NOT NULL,
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','committed','released')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX billing_reservations_user_idx ON billing_credit_reservations(user_id, state);
--> statement-breakpoint
CREATE TABLE billing_webhook_events (
  id text PRIMARY KEY,
  processed_at timestamptz NOT NULL DEFAULT now()
);
