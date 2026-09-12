-- Profile view tracking: `viewed_times` on businesses is the fast-path total
-- shown to owners; business_views keeps one row per public view so views can
-- be charted over time. Views by the business's own owners (or an admin) are
-- not counted.

ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS viewed_times INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS business_views (
  id          BIGSERIAL PRIMARY KEY,
  business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  viewed_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_views_business_time
  ON business_views(business_id, viewed_at);
