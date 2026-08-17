# The Green Jar COA Dashboard

Multi-tenant COA library. Each store gets its own subdomain, public list, and admin login. Platform admins manage stores from the apex domain.

## Hosts

| Host | Purpose |
|------|---------|
| `thegreenjar.xyz` | Platform landing + `/platform` (create stores) |
| `{slug}.thegreenjar.xyz` | Store public COA page |
| `{slug}.thegreenjar.xyz/admin` | Store admin dashboard |
| `{slug}.thegreenjar.xyz/login` | Store admin login |

Reserved subdomains (not stores): `www`, `admin`, `platform`, `api`, `mail`, `app`.

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

3. Run migrations in the Supabase Dashboard → SQL Editor (in order):

- `supabase/migrations/001_coas.sql`
- `supabase/migrations/002_stores.sql`

Then seed the Green Jar store admin from env credentials:

```bash
npm run db:init
```

4. Start the dev server:

```bash
npm run dev
```

Local subdomain testing (macOS / most browsers):

- Platform: http://localhost:3000
- Store: http://green-jar.localhost:3000
- Store admin: http://green-jar.localhost:3000/admin

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import the repo in [Vercel](https://vercel.com/new).
3. Add integrations:
   - **Vercel Blob** (Storage)
   - **Supabase** via Marketplace (`vercel integration add supabase` or Dashboard → Integrations)
4. Set environment variables in the Vercel project:
   - `AUTH_SECRET`
   - `AUTH_URL=https://thegreenjar.xyz`
   - `ADMIN_EMAIL` / `ADMIN_PASSWORD` (platform admin)
   - `NEXT_PUBLIC_SITE_URL=https://thegreenjar.xyz`
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `BLOB_READ_WRITE_TOKEN` are auto-provisioned by integrations
5. Run migrations `001_coas.sql` and `002_stores.sql` in the linked Supabase project's SQL Editor, then `npm run db:init` locally against production env (or seed the Green Jar admin from `/platform`).
6. Add custom domains in Vercel → Project → Settings → Domains:
   - `thegreenjar.xyz`
   - `www.thegreenjar.xyz` (optional)
   - `*.thegreenjar.xyz` (**wildcard** — required for store subdomains)
7. Update DNS at your registrar:
   - Apex `thegreenjar.xyz` → `76.76.21.21` (A record) or registrar ALIAS to Vercel
   - Optional `www` → `cname.vercel-dns.com`
   - Wildcard `*` → `cname.vercel-dns.com` (or the target Vercel shows for `*.thegreenjar.xyz`)

## Auth model

- **Platform admin** — env `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Logs in on the apex domain and uses `/platform` to create stores (name, slug, store admin email/password).
- **Store admin** — stored in `store_users` (bcrypt). Logs in only on that store's subdomain.

Existing Green Jar COAs are migrated to the seeded store `green-jar`.

## Routes

| URL | Access |
|-----|--------|
| `/` on apex | Platform landing |
| `/platform` | Create/list stores (platform login) |
| `/` on store host | Public COA homepage for that store |
| `/admin` on store host | Store upload/manage (login required) |
| `/login` | Platform or store sign-in (depends on host) |
| `/api/coas` | Store-scoped list / finalize upload |
| `/api/coas/[id]/file` | Store-scoped PDF redirect |
| `/api/platform/stores` | Platform store CRUD |
