// app/(admin)/admin/(panel)/jobs/page.tsx
// Background jobs (#105, F4.1): every registered job, whether the daily
// schedule runs it, "Run now", and the run history — who or what started
// each run, how long it took, what it did or why it failed.

import { ListChecks } from "lucide-react";
import { AdminPageHeader, EmptyState, formatWhen, Panel, Pill } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { JOBS } from "@/lib/jobs/registry";
import { DAILY_CRON_SCHEDULE, scheduleFor } from "@/lib/jobs/schedule";
import { RunNowButton } from "./_components/RunNowButton";

export const dynamic = "force-dynamic";

const RUNS_SHOWN = 30;

function duration(ms: number | null) {
  if (ms === null) return "—";
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1)} s`;
}

function summarise(summary: unknown): string {
  if (!summary || typeof summary !== "object") return "";
  return Object.entries(summary as Record<string, unknown>)
    .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.length : typeof v === "object" && v !== null ? "…" : String(v)}`)
    .join(" · ");
}

export default async function AdminJobsPage({ searchParams }: { searchParams: Promise<{ job?: string }> }) {
  const { job } = await searchParams;
  const filter = job && job in JOBS ? job : undefined;
  const runs = await db.jobRun.findMany({ where: filter ? { job: filter } : {}, orderBy: { startedAt: "desc" }, take: RUNS_SHOWN });
  const lastByJob = new Map<string, (typeof runs)[number]>();
  for (const r of await db.jobRun.findMany({ distinct: ["job"], orderBy: [{ job: "asc" }, { startedAt: "desc" }] })) lastByJob.set(r.job, r);

  return (
    <>
      <AdminPageHeader icon={ListChecks} title="Jobs" description={`The daily run (${DAILY_CRON_SCHEDULE} UTC) runs the scheduled jobs in order. Any job can also be run now; one run of a job at a time.`} />

      <div className="mb-6 grid gap-4 lg:grid-cols-3">
        {Object.entries(JOBS).map(([name, def]) => {
          const last = lastByJob.get(name);
          return (
            <Panel key={name} title={name} description={scheduleFor(name) ? (name === "guide.canary" ? "Daily, own schedule" : "Daily") : "On demand"}>
              <p className="text-sm text-slate">{def.description}</p>
              <p className="mt-2 font-mono text-xs text-slate">{def.rules.join(" · ")}</p>
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-xs text-slate">
                  {last ? (
                    <>
                      Last: <Pill tone={last.status === "FAILED" ? "critical" : last.status === "SUCCEEDED" ? "good" : "neutral"}>{last.status.toLowerCase()}</Pill> {formatWhen(last.startedAt)}
                    </>
                  ) : (
                    "Never run"
                  )}
                </span>
                <RunNowButton job={name} />
              </div>
            </Panel>
          );
        })}
      </div>

      <Panel title={filter ? `Runs of ${filter}` : "Recent runs"} description={`The last ${RUNS_SHOWN}. Runs are permanent history.`}>
        {runs.length === 0 ? (
          <EmptyState icon={ListChecks}>No runs yet.</EmptyState>
        ) : (
          <div className="-m-5 overflow-x-auto">
            <table className="w-full min-w-[40rem] text-sm">
              <thead>
                <tr className="border-b border-ink/10 text-left text-xs text-slate">
                  <th scope="col" className="px-5 py-3 font-medium">Job</th>
                  <th scope="col" className="px-3 py-3 font-medium">Result</th>
                  <th scope="col" className="px-3 py-3 font-medium">Started by</th>
                  <th scope="col" className="px-3 py-3 font-medium">Took</th>
                  <th scope="col" className="px-5 py-3 font-medium">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/[0.06]">
                {runs.map((r) => (
                  <tr key={r.id} className="align-top">
                    <td className="px-5 py-3 font-mono text-xs text-ink">{r.job}</td>
                    <td className="px-3 py-3">
                      <Pill tone={r.status === "FAILED" ? "critical" : r.status === "SUCCEEDED" ? "good" : "neutral"}>{r.status.toLowerCase()}</Pill>
                      {r.error ? (
                        <p className="mt-1 max-w-md break-words text-xs text-critical">{r.error}</p>
                      ) : (
                        <p className="mt-1 max-w-md text-xs text-slate">{summarise(r.summary)}</p>
                      )}
                    </td>
                    <td className="px-3 py-3 text-xs text-slate">{r.trigger}</td>
                    <td className="px-3 py-3 text-xs text-slate">{duration(r.finishedAt ? r.finishedAt.getTime() - r.startedAt.getTime() : null)}</td>
                    <td className="px-5 py-3 text-xs text-slate">{formatWhen(r.startedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
}
