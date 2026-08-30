-- Ad-based ranking: businesses subscribe to a plan (basic/standard/premium)
-- and are ranked by tier in listings. `plan` on businesses is the fast path
-- for ranking; `subscriptions` keeps the payment/renewal history.

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS plan VARCHAR(20) NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'basic', 'standard', 'premium')),
  ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS subscriptions (
  id          SERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan        VARCHAR(20) NOT NULL CHECK (plan IN ('basic', 'standard', 'premium')),
  amount_rwf  INTEGER NOT NULL,
  starts_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at  TIMESTAMPTZ NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_business ON subscriptions(business_id);
CREATE INDEX IF NOT EXISTS idx_businesses_plan ON businesses(plan);
