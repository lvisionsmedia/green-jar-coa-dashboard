-- Tell a Friend referral program

CREATE TABLE IF NOT EXISTS referrers (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone_e164 TEXT NOT NULL,
  phone_display TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_weekly_email_at TIMESTAMPTZ,
  email_opt_out_at TIMESTAMPTZ,
  unsubscribe_token TEXT NOT NULL,
  signup_ip TEXT,
  CONSTRAINT referrers_store_email_unique UNIQUE (store_id, email),
  CONSTRAINT referrers_store_phone_unique UNIQUE (store_id, phone_e164),
  CONSTRAINT referrers_unsubscribe_token_unique UNIQUE (unsubscribe_token)
);

CREATE INDEX IF NOT EXISTS referrers_store_id_idx ON referrers (store_id);
CREATE INDEX IF NOT EXISTS referrers_weekly_email_idx
  ON referrers (store_id, last_weekly_email_at, created_at)
  WHERE email_opt_out_at IS NULL;

CREATE TABLE IF NOT EXISTS referral_redemptions (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  referrer_id TEXT NOT NULL REFERENCES referrers(id) ON DELETE CASCADE,
  friend_name TEXT NOT NULL,
  friend_phone_e164 TEXT NOT NULL,
  friend_email TEXT NOT NULL,
  reward_choice TEXT NOT NULL CHECK (reward_choice IN ('gram', 'thc_drink')),
  redeemed_by TEXT NOT NULL,
  redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  referrer_email_sent_at TIMESTAMPTZ,
  friend_email_sent_at TIMESTAMPTZ,
  CONSTRAINT referral_redemptions_friend_phone_unique UNIQUE (store_id, friend_phone_e164),
  CONSTRAINT referral_redemptions_friend_email_unique UNIQUE (store_id, friend_email)
);

CREATE INDEX IF NOT EXISTS referral_redemptions_store_id_idx
  ON referral_redemptions (store_id, redeemed_at DESC);
CREATE INDEX IF NOT EXISTS referral_redemptions_referrer_id_idx
  ON referral_redemptions (referrer_id);

CREATE TABLE IF NOT EXISTS referrer_rewards (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  referrer_id TEXT NOT NULL REFERENCES referrers(id) ON DELETE CASCADE,
  redemption_id TEXT NOT NULL REFERENCES referral_redemptions(id) ON DELETE CASCADE,
  claim_code TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'claimed', 'expired')),
  reward_choice TEXT CHECK (reward_choice IS NULL OR reward_choice IN ('gram', 'thc_drink')),
  expires_at TIMESTAMPTZ NOT NULL,
  claimed_at TIMESTAMPTZ,
  claimed_by TEXT,
  CONSTRAINT referrer_rewards_redemption_unique UNIQUE (redemption_id),
  CONSTRAINT referrer_rewards_claim_code_unique UNIQUE (claim_code)
);

CREATE INDEX IF NOT EXISTS referrer_rewards_store_status_idx
  ON referrer_rewards (store_id, status, expires_at);
CREATE INDEX IF NOT EXISTS referrer_rewards_referrer_id_idx
  ON referrer_rewards (referrer_id);
CREATE INDEX IF NOT EXISTS referrer_rewards_claim_code_idx
  ON referrer_rewards (claim_code);

CREATE TABLE IF NOT EXISTS referral_signup_attempts (
  id BIGSERIAL PRIMARY KEY,
  ip TEXT NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS referral_signup_attempts_ip_time_idx
  ON referral_signup_attempts (ip, attempted_at DESC);

ALTER TABLE referrers ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE referrer_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE referral_signup_attempts ENABLE ROW LEVEL SECURITY;
