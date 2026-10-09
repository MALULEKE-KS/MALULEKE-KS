// lib/jobs/registry.ts
// Every scheduled job, by name (#94, F4.1). A new job is one entry here (and,
// if it runs daily, one name in lib/jobs/schedule.ts) — the cron route, the
// admin's run-now endpoint and the run history all pick it up (EXT-1).
// Each job runs through runJob: one at a time (database lock), every run
// recorded in JobRun with what started it.

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { proposeComputedMetrics } from "@/lib/metrics";
import { runGithubSync } from "@/lib/jobs/github-sync";
import { runDailyMaintenance } from "@/lib/jobs/maintenance";
import { runSystemWriteups } from "@/lib/jobs/system-writeups";
import { runSystemScreenshots } from "@/lib/systems/screenshots";
import { sendDue } from "@/lib/notifications";
import { runGuideCanary } from "@/lib/guide/canary";
import { runJob, type JobTrigger, type RunJobResult } from "@/lib/jobs/run-job";
import { DAILY_JOBS } from "@/lib/jobs/schedule";

export interface JobDefinition {
  description: string;
  rules: string[];
  run: () => Promise<Prisma.InputJsonValue>;
}

export const JOBS = {
  "maintenance.daily": {
    description: "Retention (BR-5.2): strip personal data from inquiries and events past the retention period; prune expired rate-limit and sign-in rows.",
    rules: ["BR-5.2", "BR-2.4", "BR-3.5"],
    run: runDailyMaintenance,
  },
  "metrics.compute": {
    description: "Compute the registered numbers from public data and propose any changed value for the admin to approve (BR-5.3).",
    rules: ["BR-5.3"],
    run: () => db.$transaction((tx) => proposeComputedMetrics(tx)),
  },
  "guide.canary": {
    description: "Put a few fixed questions through the live AI guide and check each answer by plain rules (no leaked instructions, no salary figure, still itself, still grounded) — a failure is the earliest sign a prompt, model or limit broke it. Records the run for Admin → Guide health.",
    rules: ["BR-4.3", "BR-4.6"],
    run: async () => {
      const summary = await runGuideCanary("schedule");
      if (summary.failed > 0) throw new Error(`The guide failed ${summary.failed} of ${summary.total} canary checks: ${summary.failedIds.join(", ")}.`);
      return summary;
    },
  },
  "github.sync": {
    description: "Sync every repo the owner's GitHub token can see into the curation queue, with metadata and weekly activity.",
    rules: ["BR-1.6", "BR-1.7", "BR-1.11", "BR-1.14", "BR-8.2"],
    run: runGithubSync,
  },
  "systems.writeups": {
    description: "Write each live system's description and case study with AI from its public repo, when the repo has changed — never over the owner's own words (off until writeups.enabled).",
    rules: ["BR-4.5", "BR-4.4", "BR-1.7"],
    run: () => runSystemWriteups(),
  },
  "systems.screenshots": {
    description: "Capture each live system's site as its screenshot — new sites, changed addresses, and captures older than screenshots.refreshDays — never over one the owner uploaded.",
    rules: ["BR-1.18", "BR-1.3"],
    run: () => runSystemScreenshots(),
  },
  "notifications.send": {
    description: "Send queued email (Let's Talk alerts and confirmations) and retry failed sends with backoff — a failure never undoes the inquiry it reports (LT-10). Waits harmlessly until email is connected.",
    rules: ["LT-10", "LT-9"],
    run: async () => ({ ...(await sendDue(50)) }),
  },
} satisfies Record<string, JobDefinition>;

export type JobName = keyof typeof JOBS;

export function isJobName(name: string): name is JobName {
  return Object.prototype.hasOwnProperty.call(JOBS, name);
}

export function runNamedJob(name: JobName, trigger: JobTrigger): Promise<RunJobResult<Prisma.InputJsonValue>> {
  const work: () => Promise<Prisma.InputJsonValue> = () => JOBS[name].run();
  return runJob(name, work, trigger);
}

/** The daily batch, in order; one job failing doesn't stop the rest. */
export async function runDailyJobs(trigger: JobTrigger) {
  const results: { job: JobName; status: string; runId?: string; error?: string }[] = [];
  for (const job of DAILY_JOBS) {
    const run = await runNamedJob(job, trigger);
    results.push({
      job,
      status: run.status,
      ...(run.status !== "already_running" && { runId: run.runId }),
      ...(run.status === "failed" && { error: run.error }),
    });
  }
  return results;
}
