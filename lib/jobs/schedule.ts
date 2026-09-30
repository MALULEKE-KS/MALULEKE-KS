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

export const DAILY_JOBS = ["maintenance.daily", "metrics.compute", "github.sync"] as const;
