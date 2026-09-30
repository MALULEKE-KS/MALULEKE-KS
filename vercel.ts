// vercel.ts — project configuration (Vercel's recommended TypeScript format).
//
// The build runs scripts/vercel-build.mjs instead of a bare `next build`, so a
// deployment can apply its database migrations first, over a direct
// connection, before the new code is built. Whether it does is decided per
// environment by DB_MIGRATE_ON_BUILD (see docs/DEPLOYMENT.md), never by the
// code itself.

import type { VercelConfig } from "@vercel/config/v1";

export const config: VercelConfig = {
  framework: "nextjs",
  buildCommand: "node scripts/vercel-build.mjs",
  // Skip builds that can't change the running site (docs/tests/CI-only, and
  // backend-only previews) — the Hobby plan caps deployments per day.
  ignoreCommand: "node scripts/vercel-ignore.mjs",
  // Scheduled jobs (#94): one daily entry runs the daily jobs in order
  // (lib/jobs/schedule.ts). Authorized by CRON_SECRET, which Vercel sends.
  // Literals on purpose: Vercel evaluates this file on its own, without the
  // app's modules — tests/unit/vercel-config.test.ts keeps them equal to
  // DAILY_CRON_PATH / DAILY_CRON_SCHEDULE.
  crons: [{ path: "/api/cron/daily", schedule: "0 3 * * *" }],
};
