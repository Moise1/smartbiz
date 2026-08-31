-- Many-to-many ownership: a user can have many businesses and a business can
-- belong to many users. businesses.owner_id remains as "created by"; access
-- control now goes through this join table.

CREATE TABLE IF NOT EXISTS user_businesses (
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, business_id)
);

CREATE INDEX IF NOT EXISTS idx_user_businesses_business ON user_businesses(business_id);

-- Backfill: every existing owner keeps their businesses.
INSERT INTO user_businesses (user_id, business_id)
SELECT owner_id, id FROM businesses
ON CONFLICT DO NOTHING;
