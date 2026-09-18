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
};
