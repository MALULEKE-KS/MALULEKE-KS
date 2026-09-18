# MALULEKE-KS — Deployment

**Status:** Live in production.
**URL:** https://maluleke-ks.vercel.app

---

## Infrastructure

| Piece | Provider | Notes |
|---|---|---|
| Hosting | Vercel | Project `maluleke-ks` under the `ksdrills-projects` team (Hobby plan) |
| Git integration | GitHub → Vercel | `MALULEKE-KS/MALULEKE-KS`, `main` branch. Every push to `main` auto-deploys to production; every PR gets its own Preview deployment |
| Database | Neon Postgres (via Vercel Marketplace) | Resource name `neon-blue-planet`. Provisioned through `vercel integration add neon`, not manually — this auto-injects `DATABASE_URL` and related `PG*`/`POSTGRES_*` vars into all three Vercel environments (Production, Preview, Development) |
| pgvector | Neon (native support) | The `ContentChunk.embedding vector(1536)` column (V1.1 RAG, unbuilt) needs the `vector` extension — already handled inside the `init` migration itself (`CREATE EXTENSION IF NOT EXISTS "vector"`), not a manual step |

## Environment variables

Vercel's import flow detects 18 keys from `.env.example`, but only **3 are actually read by the deployed app** — everything else in `.env.example` documents intent for V1.1 features (AI concierge, observability adapters, analytics) that aren't wired into any route yet. Confirmed by grepping for `process.env.X` usage before setting anything, not by assumption.

| Var | Required | Set via | Notes |
|---|---|---|---|
| `DATABASE_URL` | Yes | Neon integration (automatic) | Also sets `DATABASE_URL_UNPOOLED`, `PG*`, `POSTGRES_*` — none of those extra ones are read by the app; Prisma only needs `DATABASE_URL` |
| `NEXTAUTH_SECRET` | Yes | `vercel env add` (manual, fresh value) | Despite the name, this isn't NextAuth.js — it signs the hand-rolled admin session cookie (`lib/auth/session.ts`). Generated fresh for production, not reused from local dev |
| `TWO_FACTOR_ENCRYPTION_KEY` | Yes | `vercel env add` (manual, fresh value) | Encrypts `AdminUser.twoFactorSecret` at rest (`lib/auth/crypto.ts`). Also generated fresh for production |
| Everything else in `.env.example` | No | Not set | `NEXTAUTH_URL`, `AI_*`, `VERCEL_ANALYTICS_ID`, `ANALYTICS_CONSENT_REQUIRED`, `GITHUB_SYNC_*`, `SENTRY_DSN`, `BETTER_STACK_SOURCE_TOKEN`, `PROMETHEUS_PUSHGATEWAY_URL`, `INQUIRY_RATE_LIMIT_PER_IP_PER_DAY`, `DATA_RETENTION_MONTHS`, `FEATURE_FLAGS_KILL_SWITCH`. Several of these (the rate limit and retention ones especially) are currently hardcoded as constants in the routes that implement them rather than actually read from env — a real gap, worth fixing when those routes are next touched, not blocking for launch |

Both manually-set secrets were generated with `openssl rand -base64 32` and stored as Vercel **Secret** type (write-only — cannot be read back via `vercel env pull`, only rotated). If they ever need rotating: generate a new value, `vercel env rm <name> production && vercel env add <name> production --value=... --sensitive`, then redeploy.

## First-deploy bootstrap (already done, documented for the next time this is needed — a DB reset, a second environment, etc.)

```bash
# 1. Pull production env vars locally (secrets come back as [SENSITIVE] placeholders —
#    patch in the real values you generated, or re-derive them if rotating)
vercel env pull .env.production.local --environment=production --yes

# 2. Apply all migrations
npx dotenv -e .env.production.local -- npx prisma migrate deploy

# 3. Seed lookup tables, organizations, the real seed systems, one Experience
#    entry, and feature flags (all disabled per BR-4.4)
npx dotenv -e .env.production.local -- npx tsx prisma/seed.ts

# 4. Create the single AdminUser row (BR-3.1/3.11) — prints a TOTP secret and
#    10 recovery codes exactly once, never stored anywhere retrievable.
#    Run this yourself; don't hand the password to an agent to run on your behalf.
ADMIN_EMAIL="you@example.com" ADMIN_PASSWORD="..." \
  npx dotenv -e .env.production.local -- npx tsx scripts/create-admin.ts

# 5. Delete the local file — it holds the real production DATABASE_URL
rm .env.production.local
```

## Database migrations — how schema changes reach each environment

Migrations are applied **by the deployment build**, before the new code is built (`vercel.ts` → `scripts/vercel-build.mjs`):

1. If `DB_MIGRATE_ON_BUILD=true` for that Vercel environment, `prisma migrate deploy` runs over the direct connection (`DATABASE_URL_UNPOOLED`, the schema's `directUrl`).
2. Then `next build`.
3. If the migration fails, the build fails and nothing is deployed — code never goes live against a schema it doesn't match.

This is safe while the previous deployment is still serving because every migration is **additive** (EXT-1: add → backfill → switch readers → only then remove), so old code keeps working on the new schema.

**Enable per environment** (Vercel → Project → Settings → Environment Variables):

| Environment | `DB_MIGRATE_ON_BUILD` | Precondition |
|---|---|---|
| Production | `true` | — |
| Preview | `true` **only after** preview branching is on | Otherwise a PR's migration would run against production |

**Preview branching** (isolates every PR's database): Vercel → Project → Storage → `neon-blue-planet` → integration settings → enable *create a database branch for each preview deployment*. Each preview then gets its own Neon branch (a copy-on-write copy of production) with its own `DATABASE_URL` / `DATABASE_URL_UNPOOLED`, so the PR's migration is tested on real data without touching production.

## Local development — never against production

`.env.local` holds the production connection string (pulled from Vercel). Nothing local uses it for the database anymore:

| File | Database | Used by |
|---|---|---|
| `.env.development.local` | local `malulekeks_dev` (Postgres 16 on this machine) | `next dev` (Next loads it ahead of `.env.local`) and every `npm run prisma:*`, `db:seed`, `sync:github`, `create-admin` script |
| `.env.test.local` | local `malulekeks_test` (disposable) | Vitest — and `vitest.config.mts` **refuses to run** against any non-local host outside CI |

Both databases need the `vector` and `pgcrypto` extensions (created once by a superuser); the app connects as a dedicated `malulekeks_dev` role, never `postgres`.

Production data operations (bootstrap, admin creation) keep their explicit, separate runbook above, using a temporary `.env.production.local` that's deleted afterwards.

## Redeploying

Normal case: push to `main`, Vercel deploys automatically. Manual trigger from local (matches whatever's currently checked out, not necessarily what's on GitHub — prefer a real push):

```bash
vercel deploy --prod
```

## Verifying a deploy

```bash
curl -s -o /dev/null -w "%{http_code}\n" https://maluleke-ks.vercel.app/
curl -s -o /dev/null -w "%{http_code}\n" https://maluleke-ks.vercel.app/systems
curl -s -o /dev/null -w "%{http_code}\n" https://maluleke-ks.vercel.app/admin/login
```

All three should return `200`. `/systems` returning real seeded system names (not an error page) confirms the production database connection specifically, not just that the build succeeded.

## Known gaps

- **Custom domain** — not configured yet, still on the `*.vercel.app` subdomain.
- **`scripts/github-sync.ts`** — reads `GITHUB_SYNC_TOKEN`/`GITHUB_SYNC_ORGS`, neither set in production. Not part of the deployed app's request path (nothing calls it automatically), so this doesn't block anything — it just means the GitHub-sync job hasn't been run against production data yet, and would need a real read-only PAT if/when it is.
- **Env vars documented but unread** — see the table above. `INQUIRY_RATE_LIMIT_PER_IP_PER_DAY` and `DATA_RETENTION_MONTHS` in particular describe real business rules (BR-2.4, BR-5.2) that are currently enforced via hardcoded constants instead of these vars. Worth reconciling next time those files are touched.
