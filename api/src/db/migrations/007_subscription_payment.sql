-- Payment checkout (simulated): record how a subscription was paid for.
-- payment_method is 'momo' or 'card'; payment_reference is a masked,
-- human-readable string (e.g. "MoMo 078****123" or "VISA ****4242").

ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS payment_method    VARCHAR(10),
  ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(60);
