-- Lock stores and store_users from the public Data API.
-- The Next.js app uses the service_role key, which bypasses RLS.
-- No anon/authenticated policies on purpose: public clients must not
-- read store slugs or password hashes.

ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_users ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.stores FORCE ROW LEVEL SECURITY;
ALTER TABLE public.store_users FORCE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.stores FROM anon, authenticated;
REVOKE ALL ON TABLE public.store_users FROM anon, authenticated;
