-- Friend self-reservation before in-store redeem

ALTER TABLE referral_redemptions
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'redeemed',
  ADD COLUMN IF NOT EXISTS reserved_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

ALTER TABLE referral_redemptions
  DROP CONSTRAINT IF EXISTS referral_redemptions_status_check;

ALTER TABLE referral_redemptions
  ADD CONSTRAINT referral_redemptions_status_check
  CHECK (status IN ('reserved', 'redeemed', 'expired'));

ALTER TABLE referral_redemptions
  ALTER COLUMN redeemed_by DROP NOT NULL;

ALTER TABLE referral_redemptions
  ALTER COLUMN redeemed_at DROP NOT NULL;

UPDATE referral_redemptions
SET
  reserved_at = COALESCE(reserved_at, redeemed_at, NOW()),
  status = COALESCE(NULLIF(status, ''), 'redeemed')
WHERE reserved_at IS NULL OR status IS NULL OR status = '';

CREATE INDEX IF NOT EXISTS referral_redemptions_store_status_idx
  ON referral_redemptions (store_id, status, expires_at);

CREATE INDEX IF NOT EXISTS referral_redemptions_friend_phone_status_idx
  ON referral_redemptions (store_id, friend_phone_e164, status);
