// lib/jobs/run-job.ts
// Runs a scheduled job with its run recorded in JobRun (#70). The database is
// the lock: a partial unique index allows one RUNNING row per job, so a second
// overlapping run is refused at insert time — no in-memory flag, no race.
// Finished runs are immutable history (a database trigger), and the CHECKs
// guarantee every run ends SUCCEEDED or FAILED-with-an-error.
//
// Each run records what started it (#94): the schedule, an admin (named), or a
// script. A run whose process died without finishing — e.g. a function stopped
// by its time limit — would hold the lock forever; so a RUNNING row older than
// the jobs.staleAfterMinutes setting is closed as FAILED ("abandoned") before
// the next run starts.
//
// Runner-agnostic (Ports & Adapters): whatever scheduler adapter fires a job
// (lib/adapters/scheduler/) calls it through here.

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";

export type RunJobResult<T> =
  | { status: "succeeded"; runId: string; result: T }
  | { status: "failed"; runId: string; error: string }
  | { status: "already_running" };

export type JobTrigger = { kind: "schedule" } | { kind: "script" } | { kind: "admin"; adminUserId: string };

/** Close runs of `job` that have been RUNNING longer than the setting allows. */
export async function closeAbandonedRuns(job: string): Promise<number> {
  const staleAfterMinutes = await getSetting("jobs.staleAfterMinutes");
  const { count } = await db.jobRun.updateMany({
    where: { job, status: "RUNNING", startedAt: { lt: new Date(Date.now() - staleAfterMinutes * 60 * 1000) } },
    data: {
      status: "FAILED",
      finishedAt: new Date(),
      error: `Abandoned: still running after ${staleAfterMinutes} minutes (the process was likely stopped by its time limit).`,
    },
  });
  return count;
}

export async function runJob<T extends Prisma.InputJsonValue>(
  job: string,
  work: () => Promise<T>,
  trigger: JobTrigger = { kind: "script" },
): Promise<RunJobResult<T>> {
  await closeAbandonedRuns(job);

  let runId: string;
  try {
    runId = (
      await db.jobRun.create({
        data: { job, trigger: trigger.kind, adminUserId: trigger.kind === "admin" ? trigger.adminUserId : null },
      })
    ).id;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return { status: "already_running" };
    }
    throw err;
  }

  try {
    const result = await work();
    await db.jobRun.update({
      where: { id: runId },
      data: { status: "SUCCEEDED", finishedAt: new Date(), summary: result },
    });
    return { status: "succeeded", runId, result };
  } catch (err) {
    const error = (err instanceof Error ? err.message || err.name : String(err)) || "Unknown error";
    await db.jobRun.update({
      where: { id: runId },
      data: { status: "FAILED", finishedAt: new Date(), error: error.slice(0, 2000) },
    });
    return { status: "failed", runId, error };
  }
}
