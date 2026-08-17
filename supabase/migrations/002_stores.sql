-- Multi-tenant stores

CREATE TABLE IF NOT EXISTS stores (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT stores_slug_format CHECK (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$')
);

CREATE TABLE IF NOT EXISTS store_users (
  id TEXT PRIMARY KEY,
  store_id TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT store_users_store_email_unique UNIQUE (store_id, email)
);

CREATE INDEX IF NOT EXISTS store_users_email_idx ON store_users (email);
CREATE INDEX IF NOT EXISTS stores_slug_idx ON stores (slug);

INSERT INTO stores (id, slug, name)
VALUES ('store_green_jar', 'green-jar', 'The Green Jar')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE coas ADD COLUMN IF NOT EXISTS store_id TEXT;

UPDATE coas
SET store_id = 'store_green_jar'
WHERE store_id IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'coas_store_id_fkey'
  ) THEN
    ALTER TABLE coas
      ADD CONSTRAINT coas_store_id_fkey
      FOREIGN KEY (store_id) REFERENCES stores(id);
  END IF;
END $$;

ALTER TABLE coas ALTER COLUMN store_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS coas_store_id_idx ON coas (store_id);
CREATE INDEX IF NOT EXISTS coas_store_uploaded_at_idx ON coas (store_id, uploaded_at DESC);
