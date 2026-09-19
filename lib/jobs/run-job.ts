// lib/jobs/run-job.ts
// Runs a scheduled job with its run recorded in JobRun (#70). The database is
// the lock: a partial unique index allows one RUNNING row per job, so a second
// overlapping run is refused at insert time — no in-memory flag, no race.
// Finished runs are immutable history (a database trigger), and the CHECKs
// guarantee every run ends SUCCEEDED or FAILED-with-an-error.
//
// Runner-agnostic (Ports & Adapters): whatever scheduler adapter fires a job
// (lib/adapters/scheduler/) calls it through here.

import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

export type RunJobResult<T> =
  | { status: "succeeded"; runId: string; result: T }
  | { status: "failed"; runId: string; error: string }
  | { status: "already_running" };

export async function runJob<T extends Prisma.InputJsonValue>(
  job: string,
  work: () => Promise<T>,
): Promise<RunJobResult<T>> {
  let runId: string;
  try {
    runId = (await db.jobRun.create({ data: { job } })).id;
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
    const error = err instanceof Error ? err.message || err.name : String(err);
    await db.jobRun.update({
      where: { id: runId },
      data: { status: "FAILED", finishedAt: new Date(), error: error || "Unknown error" },
    });
    return { status: "failed", runId, error };
  }
}
