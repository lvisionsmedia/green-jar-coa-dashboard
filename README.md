# The Green Jar COA Dashboard

Multi-tenant COA library. Each store gets its own path under `/store/{slug}`, public list, and admin login. Platform admins manage stores from `/platform`.

## URLs

| URL | Purpose |
|-----|---------|
| `thegreenjar.xyz/` | Platform landing |
| `thegreenjar.xyz/platform` | Create and list stores |
| `thegreenjar.xyz/login` | Platform admin login |
| `thegreenjar.xyz/store/{slug}` | Store public COA page |
| `thegreenjar.xyz/store/{slug}/admin` | Store admin dashboard |
| `thegreenjar.xyz/store/{slug}/login` | Store admin login |

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

Local URLs:

- Platform: http://localhost:3000
- Store public: http://localhost:3000/store/green-jar
- Store admin: http://localhost:3000/store/green-jar/admin
- Store login: http://localhost:3000/store/green-jar/login

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
   - `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, and `BLOB_READ_WRITE_TOKEN` are auto-provisioned by integrations
5. Run migrations `001_coas.sql` and `002_stores.sql` in the linked Supabase project's SQL Editor, then `npm run db:init` locally against production env (or seed the Green Jar admin from `/platform`).
6. Add custom domains in Vercel → Project → Settings → Domains:
   - `thegreenjar.xyz`
   - `www.thegreenjar.xyz` (optional)
7. Update DNS at your registrar:
   - Apex `thegreenjar.xyz` → `76.76.21.21` (A record) or registrar ALIAS to Vercel
   - Optional `www` → `cname.vercel-dns.com`

No wildcard domain is required.

## Auth model

- **Platform admin** — env `ADMIN_EMAIL` / `ADMIN_PASSWORD`. Logs in at `/login` and uses `/platform` to create stores (name, slug, store admin email/password).
- **Store admin** — stored in `store_users` (bcrypt). Logs in at `/store/{slug}/login`.

Existing Green Jar COAs are migrated to the seeded store `green-jar`.

## Routes

| URL | Access |
|-----|--------|
| `/` | Platform landing |
| `/platform` | Create/list stores (platform login) |
| `/store/{slug}` | Public COA homepage for that store |
| `/store/{slug}/admin` | Store upload/manage (login required) |
| `/store/{slug}/login` | Store admin sign-in |
| `/login` | Platform sign-in |
| `/api/coas?storeSlug=` | Store-scoped list / finalize upload |
| `/api/coas/[id]/file?storeSlug=` | Store-scoped PDF redirect |
| `/api/platform/stores` | Platform store CRUD |
