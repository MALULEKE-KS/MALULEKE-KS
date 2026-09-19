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
| `DATABASE_URL` | Yes | Neon integration (automatic) | Also sets `DATABASE_URL_UNPOOLED`, `PG*`, `POSTGRES_*` — none of those extra ones are read by the app; the owner URLs are used for migrations (`DATABASE_URL_UNPOOLED`) and as the fallback when the role URLs below aren't set |
| `DATABASE_URL_RUNTIME` | Yes (F1.8) | Owner, via `scripts/create-db-roles.ts` — Sensitive, Production + Preview | The application's connection, as `app_runtime` (group `platform_runtime`): rows only, no schema changes |
| `DATABASE_URL_PUBLIC` | Yes (F1.8) | Owner, via `scripts/create-db-roles.ts` — Sensitive, Production + Preview | Public pages' connection, as `app_public` (group `platform_public`): the masked public views only |
| `NEXTAUTH_SECRET` | Yes | `vercel env add` (manual, fresh value) | Despite the name, this isn't NextAuth.js — it signs the hand-rolled admin session cookie (`lib/auth/session.ts`). Generated fresh for production, not reused from local dev |
| `TWO_FACTOR_ENCRYPTION_KEY` | Yes | `vercel env add` (manual, fresh value) | Encrypts `AdminUser.twoFactorSecret` at rest (`lib/auth/crypto.ts`). Also generated fresh for production |
| Everything else in `.env.example` | No | Not set | `NEXTAUTH_URL`, `AI_*`, `VERCEL_ANALYTICS_ID`, `ANALYTICS_CONSENT_REQUIRED`, `GITHUB_SYNC_*`, `SENTRY_DSN`, `BETTER_STACK_SOURCE_TOKEN`, `PROMETHEUS_PUSHGATEWAY_URL`, `FEATURE_FLAGS_KILL_SWITCH`. Rate limits, the review SLA and retention are not env vars: they're admin-editable platform settings in the `PlatformSetting` table (defaults and bounds in `lib/settings/registry.ts`), changed without a redeploy |

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

# 4. Create the single AdminUser row (BR-3.1/3.11) — see "Admin account" below.
#    Run it yourself, in your own terminal: it prints the TOTP secret and 10
#    recovery codes exactly once, and they must never land in a chat or a log.

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

## Database roles — least privilege (F1.8, #76)

The application never connects as the database owner. Three roles, one job each:

| Role | Connects via | Can | Can't |
|---|---|---|---|
| owner (`neondb_owner`) | `DATABASE_URL_UNPOOLED`, during the build | everything — it runs migrations | — it isn't used at runtime |
| `app_runtime` ∈ `platform_runtime` | `DATABASE_URL_RUNTIME` → `db` | read/write rows | alter/drop tables, triggers, constraints or views; truncate; update or delete audit/status history; delete systems, documents or metric history; read the migration ledger |
| `app_public` ∈ `platform_public` | `DATABASE_URL_PUBLIC` → `dbPublic` | SELECT the masked public views (F1.7) and public lookups | read any raw table (inquiries, admins, unpublished systems, settings…); write anything |

The group roles and their grants live in migration `20260919090000_least_privilege_roles` (safe in git: NOLOGIN, no passwords). Tables added by later migrations get the runtime's grants automatically (default privileges); a new **public** view must be granted to `platform_public` explicitly — public by opt-in.

**One-time setup, per environment (production done by the owner):**

1. Deploy the F1.8 migration (merging it does this).
2. In your own terminal: `npx dotenv -e .env.local -- npx tsx scripts/create-db-roles.ts` — creates `app_runtime` and `app_public` with generated passwords, verifies each, and prints `DATABASE_URL_RUNTIME=…` and `DATABASE_URL_PUBLIC=…`.
3. Vercel → Project → Settings → Environment Variables: add both, **Sensitive**, Production + Preview.
4. Redeploy once. Verify: `SELECT usename, count(*) FROM pg_stat_activity GROUP BY 1` (read-only) shows `app_runtime` / `app_public` connections, not the owner.

Rotating: `… create-db-roles.ts --rotate`, update both variables, redeploy.

Until the variables are set, both clients fall back to `DATABASE_URL` (the owner) — nothing breaks, but nothing is restricted either.

**Locally:** the dev role needs `CREATEROLE` once (`ALTER ROLE malulekeks_dev CREATEROLE` as the local superuser). `.env.development.local` / `.env.test.local` set `DATABASE_URL_PUBLIC` to a local `platform_public` login, so the test suite's public reads run restricted — as CI does.

## Local development — never against production

`.env.local` holds the production connection string (pulled from Vercel). Nothing local uses it for the database anymore:

| File | Database | Used by |
|---|---|---|
| `.env.development.local` | local `malulekeks_dev` (Postgres 16 on this machine) | `next dev` (Next loads it ahead of `.env.local`) and every `npm run prisma:*`, `db:seed`, `sync:github`, `create-admin` script |
| `.env.test.local` | local `malulekeks_test` (disposable) | Vitest — and `vitest.config.mts` **refuses to run** against any non-local host outside CI |

Both databases need the `vector` and `pgcrypto` extensions (created once by a superuser); the app connects as a dedicated `malulekeks_dev` role, never `postgres`.

Production data operations (bootstrap, admin creation) keep their explicit, separate runbook above, using a temporary `.env.production.local` that's deleted afterwards.

## Admin account — creation and recovery

Both scripts run **in your own terminal**, never through an assistant (their output and inputs are secrets). Passwords come from masked prompts and are entered **twice** — a masked prompt hides typos, which is exactly how the first production password ended up different from the one intended.

**Create** (once — the platform is single-owner):

```powershell
$env:TWO_FACTOR_ENCRYPTION_KEY = "<the production key>"   # must match Vercel's Production value
$env:ADMIN_EMAIL = "you@example.com"
$env:ADMIN_PASSWORD = Read-Host "Password" -MaskInput
$env:ADMIN_PASSWORD_CONFIRM = Read-Host "Confirm password" -MaskInput
npx dotenv -e .env.local -- npx tsx scripts/create-admin.ts
Remove-Item Env:ADMIN_PASSWORD, Env:ADMIN_PASSWORD_CONFIRM, Env:TWO_FACTOR_ENCRYPTION_KEY
```

The 2FA secret is encrypted with `TWO_FACTOR_ENCRYPTION_KEY`, and production's value is a write-only Vercel secret — so the key used here must be the one production runs. If it isn't known, rotate it first (generate → set in Vercel Production → redeploy), which is only safe while no admin exists yet. Note `npm run create-admin` targets the **local** database.

**Recover a lost password** (BR-3.13 operator procedure — there is no self-serve reset):

```powershell
$env:ADMIN_EMAIL = "you@example.com"
$env:ADMIN_PASSWORD = Read-Host "New password" -MaskInput
$env:ADMIN_PASSWORD_CONFIRM = Read-Host "Confirm new password" -MaskInput
npx dotenv -e .env.local -- npx tsx scripts/reset-admin-password.ts
Remove-Item Env:ADMIN_PASSWORD, Env:ADMIN_PASSWORD_CONFIRM
```

Verifies the new hash, clears the failed-attempt counter and any lock, and writes an audit entry (SYSTEM actor). 2FA and recovery codes are untouched. A password is data: no redeploy needed.

## Deploy budget (Vercel Hobby caps deployments per day)

- `vercel.ts` `ignoreCommand` → `scripts/vercel-ignore.mjs` **skips builds** whose changes touch only docs, tests, CI or Markdown, and **skips previews** unless UI paths changed (CI already builds and tests every PR). Anything it can't diff, it builds.
- Ship related issues in **one PR** (several `Closes #N`) → one production deploy.
- Push a branch **once** when it's ready; every push is a preview build.
- **No manual redeploys** unless an env var changed — and batch env changes into one redeploy. A redeploy of the already-deployed commit always builds (the ignore script treats it as deliberate); before #78 it was skipped and shown as *Canceled*.
- **Migrations stay additive (F1.9):** CI's `migration-guard` refuses edits to applied migrations and, in new ones, any drop / rename / type change / truncate / delete / trigger-disable that lacks a `-- migration-guard: allow <reason (#issue)>` line directly above it. Destructive changes are possible — but always deliberate, explained and reviewed.

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
- **Env vars documented but unread** — see the table above. The rate-limit and retention vars that used to be listed here were removed: those tunables now live in the `PlatformSetting` table (#67).
