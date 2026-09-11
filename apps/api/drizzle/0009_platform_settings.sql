CREATE TABLE platform_settings (
  id text PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
  default_ai_model text NOT NULL DEFAULT 'gpt-5.4-mini',
  default_beta_generation_balance integer NOT NULL DEFAULT 10 CHECK (default_beta_generation_balance BETWEEN 1 AND 10000),
  updated_at timestamptz NOT NULL DEFAULT now()
);
