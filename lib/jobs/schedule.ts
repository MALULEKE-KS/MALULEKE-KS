// lib/jobs/schedule.ts
// When scheduled jobs run (#94, F4.1). Plain data with no imports, so
// vercel.ts can read it at build time without pulling in the application.
//
// One daily cron entry runs the daily jobs in this order — Vercel Hobby runs a
// cron at most once a day, and one entry stays within any per-project cron
// limit. Each job still has its own JobRun and its own lock, so one failing
// doesn't stop the others. Fast jobs go first: the GitHub sync makes the most
// network calls, so it runs last.

/** 03:00 UTC daily — quiet for visitors in every nearby timezone. */
export const DAILY_CRON_SCHEDULE = "0 3 * * *";

/** The daily cron's path; its handler runs DAILY_JOBS in order. */
export const DAILY_CRON_PATH = "/api/cron/daily";

// The write-ups follow the sync, so they read the repos as they are today.
export const DAILY_JOBS = ["maintenance.daily", "metrics.compute", "github.sync", "systems.writeups", "systems.screenshots", "notifications.send"] as const;

// The AI guide's canary has a cron entry of its own (docs/AI-GUIDE-PHASE2-PLAN.md §4 B4): it spends minutes
// on the model's rate-limited answers, so it must not share the daily batch's 300-second budget. It runs
// before the daily batch, in the quiet hours — the free models allow about five requests a minute for the
// whole site, and at 01:30 UTC no visitor is likely to be waiting on them.
export const CANARY_CRON_SCHEDULE = "30 1 * * *";
export const CANARY_JOB = "guide.canary";
export const CANARY_CRON_PATH = `/api/cron/${CANARY_JOB}`;

/** The cron expression a job runs on, or null when it only runs on demand. */
export function scheduleFor(job: string): string | null {
  if ((DAILY_JOBS as readonly string[]).includes(job)) return DAILY_CRON_SCHEDULE;
  return job === CANARY_JOB ? CANARY_CRON_SCHEDULE : null;
}
