# The Green Jar COA Dashboard

Multi-tenant COA library. Each store gets its own path under `/store/{slug}`, public list, and admin login. Platform admins manage stores from `/platform`.

Includes the **Tell a Friend** referral program on `refer.thegreenjar.xyz` (also available at `/refer`).

## URLs

| URL | Purpose |
|-----|---------|
| `thegreenjar.xyz/` | Platform landing |
| `thegreenjar.xyz/platform` | Create and list stores |
| `thegreenjar.xyz/login` | Platform admin login |
| `thegreenjar.xyz/store/{slug}` | Store public COA page |
| `thegreenjar.xyz/store/{slug}/admin` | Store admin dashboard |
| `thegreenjar.xyz/store/{slug}/admin/referrals` | Staff referral redeem / claim |
| `thegreenjar.xyz/store/{slug}/login` | Store admin login |
| `refer.thegreenjar.xyz` | Public Tell a Friend signup / share |
| `thegreenjar.xyz/refer` | Same referral UI (apex fallback) |

## Local development

1. Copy environment variables:

```bash
cp .env.example .env.local
```

2. Fill in `.env.local`:

- `AUTH_SECRET` — random 32+ character string
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — **platform** admin credentials (create stores)
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` — from your Supabase project settings
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob token
- `NEXT_PUBLIC_SITE_URL` — `http://localhost:3000` for local dev
- `NEXT_PUBLIC_REFERRAL_URL` — `http://localhost:3000/refer` for local (or `http://refer.localhost:3000`)
- `REFERRAL_STORE_SLUG` — `green-jar` (default)
- `RESEND_API_KEY` / `REFERRAL_FROM_EMAIL` — for referral emails
- `CRON_SECRET` — Bearer token for `/api/cron/referral-weekly`

3. Run migrations in the Supabase Dashboard → SQL Editor (in order):

- `supabase/migrations/001_coas.sql`
- `supabase/migrations/002_stores.sql`
- `supabase/migrations/003_referrals.sql`

Then seed the Green Jar store admin from env credentials:

```bash
npm run db:init
```

4. Start the dev server:

```bash
npm run dev
```

Local URLs:

- Platform: http://localhost:3000
- Store public: http://localhost:3000/store/green-jar
- Store admin: http://localhost:3000/store/green-jar/admin
- Referrals admin: http://localhost:3000/store/green-jar/admin/referrals
- Tell a Friend: http://localhost:3000/refer
- Refer host rewrite: http://refer.localhost:3000

## Tell a Friend (how it works)

1. Customer signs up at `/refer` with **name, email, phone** (phone = share code).
2. They text friends via the **Text a friend** button (`sms:` link with prefilled message).
3. Friend shops in-store **with a purchase**; staff opens **Referrals** admin, enters referrer phone + friend name/phone/email, selects gram or THC drink.
4. System emails the referrer a **unique claim code** (`GJ-XXXXXX`) and invites the friend to become a referrer.
5. Referrer returns; staff enters the claim code and marks gram or THC drink claimed (one-time, 90-day expiry).
6. Weekly cron emails referrers progress + a Text a friend CTA (respects unsubscribe).

**Rules:** one email/phone per referrer; a friend can only be referred once (store-wide); self-referral blocked; staff-only redeem/claim.

### Staff how-to

1. Sign in at `/store/green-jar/login`.
2. Open **Referrals** in the sidebar.
3. **Redeem friend:** enter referrer phone, friend details, confirm purchase → emails send automatically. Use **Resend** on a row if email failed.
4. **Claim referrer:** enter `GJ-…` code from their email → choose gram or drink → Mark claimed. If they lost the email, search pending codes by their phone.

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import the repo in [Vercel](https://vercel.com/new).
3. Add integrations:
   - **Vercel Blob** (Storage)
   - **Supabase** via Marketplace (`vercel integration add supabase` or Dashboard → Integrations)
4. Set environment variables in the Vercel project:
   - `AUTH_SECRET`
   - `AUTH_TRUST_HOST=true` (leave `AUTH_URL` unset)
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD` (platform admin)
   - `NEXT_PUBLIC_SITE_URL=https://thegreenjar.xyz`
   - `NEXT_PUBLIC_REFERRAL_URL=https://refer.thegreenjar.xyz`
   - `REFERRAL_STORE_SLUG=green-jar`
   - `RESEND_API_KEY` / `REFERRAL_FROM_EMAIL=Tell a Friend <rewards@refer.thegreenjar.xyz>`
   - `CRON_SECRET` (Vercel Cron sends `Authorization: Bearer $CRON_SECRET`)
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `BLOB_READ_WRITE_TOKEN` are auto-provisioned by integrations
5. Run migrations `001_coas.sql`, `002_stores.sql`, and `003_referrals.sql` in the linked Supabase project's SQL Editor, then `npm run db:init` locally against production env (or seed the Green Jar admin from `/platform`).
6. Add custom domains in Vercel → Project → Settings → Domains:
   - `thegreenjar.xyz`
   - `www.thegreenjar.xyz` (optional)
   - `refer.thegreenjar.xyz`
7. Update DNS at your registrar:
   - Apex `thegreenjar.xyz` → `76.76.21.21` (A record) or registrar ALIAS to Vercel
   - Optional `www` → `cname.vercel-dns.com`
   - `refer` → `cname.vercel-dns.com`
8. In [Resend](https://resend.com): verify domains `thegreenjar.xyz` and `refer.thegreenjar.xyz` (SPF + DKIM). Without this, referral emails will fail or land in spam. Send from `rewards@refer.thegreenjar.xyz`.
9. Confirm Vercel Cron is active for `/api/cron/referral-weekly` (see `vercel.json`, daily `0 15 * * *` UTC ≈ 10am Central).

## Auth model

- **Platform admin** — env `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Logs in at `/login` and uses `/platform` to create stores (name, slug, store admin email/password).
- **Store admin** — stored in `store_users` (bcrypt). Logs in at `/store/{slug}/login`. Also used by budtenders for referral redeem/claim in v1.

Existing Green Jar COAs are migrated to the seeded store `green-jar`.

## Routes

| URL | Access |
|-----|--------|
| `/` | Platform landing |
| `/platform` | Create/list stores (platform login) |
| `/store/{slug}` | Public COA homepage for that store |
| `/store/{slug}/admin` | Store upload/manage (login required) |
| `/store/{slug}/admin/referrals` | Referral redeem / claim (login required) |
| `/store/{slug}/login` | Store admin sign-in |
| `/login` | Platform sign-in |
| `/refer` | Tell a Friend public signup |
| `/refer/unsubscribe` | Email opt-out |
| `/api/coas?storeSlug=` | Store-scoped list / finalize upload |
| `/api/coas/[id]/file?storeSlug=` | Store-scoped PDF redirect |
| `/api/platform/stores` | Platform store CRUD |
| `/api/referrals/signup` | Public referrer signup |
| `/api/referrals?storeSlug=` | Staff list / stats |
| `/api/referrals/redeem?storeSlug=` | Staff friend redeem |
| `/api/referrals/claim?storeSlug=` | Staff claim lookup / claim |
| `/api/cron/referral-weekly` | Weekly emails + expiry (cron secret) |
