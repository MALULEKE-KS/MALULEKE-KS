// lib/adapters/scheduler/vercel-cron-adapter.ts
// The scheduler adapter (#94, F4.1): Vercel Cron calls /api/cron/... with
// `Authorization: Bearer $CRON_SECRET`. This checks that header — in constant
// time — and nothing else about the scheduler leaks into the jobs, which run
// through lib/jobs/registry.ts whatever fires them (a GitHub Actions workflow
// or a queue worker could replace this file with no change to any job).
//
// No CRON_SECRET configured = refused, never open: an unauthenticated URL that
// triggers database work would be a free denial-of-service.

import { createHash, timingSafeEqual } from "node:crypto";

export type CronAuth = { ok: true } | { ok: false; status: 401 | 503; message: string };

export function authorizeCron(request: Request): CronAuth {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return { ok: false, status: 503, message: "Scheduled jobs aren't configured: CRON_SECRET is not set." };

  const header = request.headers.get("authorization") ?? "";
  // Hash both sides so the comparison is constant-time whatever the lengths.
  const given = createHash("sha256").update(header).digest();
  const expected = createHash("sha256").update(`Bearer ${secret}`).digest();
  return timingSafeEqual(given, expected) ? { ok: true } : { ok: false, status: 401, message: "Unauthorized" };
}
