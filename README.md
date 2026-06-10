# The Green Jar COA Dashboard

Public COA library at [thegreenjar.xyz](https://thegreenjar.xyz) with a password-protected admin dashboard at `/admin`.

## Local development

1. Copy environment variables:

```bash
cp .env.example .env.local
```

2. Fill in `.env.local`:

- `AUTH_SECRET` — random 32+ character string
- `ADMIN_EMAIL` / `ADMIN_PASSWORD` — admin login credentials
- `DATABASE_URL` — Neon Postgres connection string
- `BLOB_READ_WRITE_TOKEN` — Vercel Blob token
- `NEXT_PUBLIC_SITE_URL` — `http://localhost:3000` for local dev

3. Initialize the database:

```bash
npm run db:init
```

4. Start the dev server:

```bash
npm run dev
```

- Public homepage: http://localhost:3000
- Admin dashboard: http://localhost:3000/admin
- Login: http://localhost:3000/login

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import the repo in [Vercel](https://vercel.com/new).
3. Add integrations:
   - **Vercel Blob** (Storage)
   - **Neon** (Postgres) via Marketplace
4. Set environment variables in the Vercel project:
   - `AUTH_SECRET`
   - `AUTH_URL=https://thegreenjar.xyz`
   - `ADMIN_EMAIL`
   - `ADMIN_PASSWORD`
   - `NEXT_PUBLIC_SITE_URL=https://thegreenjar.xyz`
   - `DATABASE_URL` and `BLOB_READ_WRITE_TOKEN` are auto-provisioned by integrations
5. Deploy, then run `npm run db:init` once against the production `DATABASE_URL`.
6. Add custom domain `thegreenjar.xyz` in Vercel → Project → Settings → Domains.
7. Update DNS at your registrar:
   - Apex `thegreenjar.xyz` → `76.76.21.21` (A record) or registrar ALIAS to Vercel
   - Optional `www` → `cname.vercel-dns.com`

## Routes

| URL | Access |
|-----|--------|
| `/` | Public COA homepage |
| `/admin` | Admin upload/manage (login required) |
| `/login` | Admin sign-in |
| `/api/coas` | Public list / admin upload |
| `/api/coas/[id]/file` | Public PDF access |
