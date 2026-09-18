// scripts/vercel-build.mjs — the deployment build (see vercel.ts).
//
// 1. If DB_MIGRATE_ON_BUILD=true for this environment, apply pending Prisma
//    migrations over the direct connection (DATABASE_URL_UNPOOLED).
// 2. Build Next.js.
//
// Why migrations run *before* the new code goes live, and why that's safe:
// every migration is additive (EXT-1 — add, backfill, never rename or drop in
// place), so the deployment still serving traffic keeps working against the
// new schema while this one builds. If a migration fails, the build fails and
// nothing new is deployed — code never goes live against a schema it doesn't
// match.
//
// Off by default: an environment only migrates when it's explicitly enabled.
// Preview environments should only enable it once each preview gets its own
// Neon branch — otherwise a PR's migration would run against production.

import { spawnSync } from "node:child_process";

const env = process.env.VERCEL_ENV ?? "local";
const migrate = process.env.DB_MIGRATE_ON_BUILD === "true";

function run(label, command, args) {
  console.log(`\n[vercel-build] ${label}: ${command} ${args.join(" ")}`);
  const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32" });
  if (result.status !== 0) {
    console.error(`[vercel-build] ${label} failed (exit ${result.status ?? "signal"}). Aborting the deployment.`);
    process.exit(result.status ?? 1);
  }
}

console.log(`[vercel-build] environment=${env} migrate=${migrate}`);

if (migrate) {
  if (!process.env.DATABASE_URL_UNPOOLED) {
    console.error("[vercel-build] DB_MIGRATE_ON_BUILD=true but DATABASE_URL_UNPOOLED is not set. Aborting.");
    process.exit(1);
  }
  run("migrate", "npx", ["prisma", "migrate", "deploy"]);
} else {
  console.log("[vercel-build] migrations skipped for this environment (DB_MIGRATE_ON_BUILD is not 'true').");
}

run("build", "npx", ["next", "build"]);
