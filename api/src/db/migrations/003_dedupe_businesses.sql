-- Re-running the seed duplicated businesses because ON CONFLICT DO NOTHING
-- has no unique constraint to trigger on. Remove duplicates (keeping the
-- oldest row) and add the constraint so it can't happen again.

DELETE FROM businesses b
USING businesses dup
WHERE b.id > dup.id
  AND b.name = dup.name
  AND b.city = dup.city;

CREATE UNIQUE INDEX IF NOT EXISTS uq_businesses_name_city
  ON businesses (name, city);
