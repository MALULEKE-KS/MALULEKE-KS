// app/(admin)/admin/(panel)/guide/page.tsx
// Guide health (docs/AI-GUIDE-PHASE2-PLAN.md §3 A1): how fast and how reliable
// the AI guide is, read from GuideTurn — metrics only, never what a visitor
// typed. The same numbers as GET /admin/guide/health.

import Link from "next/link";
import { Gauge } from "lucide-react";
import { AdminPageHeader, EmptyState, formatWhen, Panel, Pill, Stat } from "@/components/admin/ui";
import { HEALTH_WINDOWS, loadGuideHealth, parseWindow } from "@/lib/guide/health";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

function ms(n: number | null) {
  if (n === null) return "—";
  return n < 1000 ? `${n} ms` : `${(n / 1000).toFixed(1)} s`;
}
const pct = (x: number) => `${(x * 100).toFixed(x > 0 && x < 0.1 ? 1 : 0)}%`;
const OUTCOME_TONE: Record<string, "good" | "critical" | "neutral" | "attention"> = {
  answered: "good",
  instant: "good",
  busy: "critical",
  error: "critical",
  aborted: "neutral",
  limited: "attention",
  resting: "attention",
};

export default async function AdminGuideHealthPage({ searchParams }: { searchParams: Promise<{ days?: string }> }) {
  const days = parseWindow((await searchParams).days);
  const { summary: s, perDay, recent } = await loadGuideHealth(days);
  const peak = Math.max(1, ...perDay.map((d) => d.turns));

  return (
    <>
      <AdminPageHeader
        icon={Gauge}
        title="Guide health"
        description="How fast and how reliable the AI guide is — one row per question, timings and the model that answered. Never what a visitor typed, never who they were."
        actions={HEALTH_WINDOWS.map((w) => (
          <Link
            key={w}
            href={`/admin/guide?days=${w}`}
            aria-current={w === days ? "page" : undefined}
            className={cn("rounded-full border px-3.5 py-1.5 text-sm", w === days ? "border-ink bg-ink text-paper" : "border-ink/15 bg-sheet text-ink hover:border-ink/30")}
          >
            {w === 1 ? "24 hours" : `${w} days`}
          </Link>
        ))}
      />

      {s.turns === 0 ? (
        <EmptyState icon={Gauge}>No questions in this window yet. Numbers appear as visitors talk to the guide.</EmptyState>
      ) : (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Questions" value={s.turns} />
            <Stat label="Answered" value={`${s.answered}${s.instant ? ` (${s.instant} instant)` : ""}`} tone="good" />
            <Stat label="Busy or failed" value={`${s.busy + s.errors} · ${pct(s.failureRate)}`} tone={s.failureRate > 0.02 ? "attention" : "neutral"} />
            <Stat label="Stopped by a limit" value={s.limited + s.resting} tone={s.limited + s.resting > 0 ? "attention" : "neutral"} />
            <Stat label="First word (p50 · p95)" value={`${ms(s.firstTokenMs.p50)} · ${ms(s.firstTokenMs.p95)}`} />
            <Stat label="Full answer (p50 · p95)" value={`${ms(s.totalMs.p50)} · ${ms(s.totalMs.p95)}`} />
            <Stat label="Fallback model used" value={pct(s.fallbackRate)} tone={s.fallbackRate > 0.3 ? "attention" : "neutral"} />
            <Stat label="Prompt cache share" value={s.cacheShare === null ? "—" : pct(s.cacheShare)} />
          </div>

          <div className="mb-6 grid gap-4 lg:grid-cols-3">
            <Panel title="Questions per day" description="Failed turns (busy or error) in the darker part." className="lg:col-span-2">
              <ol className="flex h-32 items-end gap-1" aria-label="Questions per day">
                {perDay.map((d) => (
                  <li key={d.day} className="flex h-full flex-1 flex-col justify-end" title={`${d.day}: ${d.turns} questions, ${d.failed} failed`}>
                    <span className="block w-full rounded-t bg-critical/70" style={{ height: `${(d.failed / peak) * 100}%` }} />
                    <span className="block w-full bg-ink/70" style={{ height: `${((d.turns - d.failed) / peak) * 100}%`, minHeight: d.turns > 0 ? 2 : 0 }} />
                  </li>
                ))}
              </ol>
              <p className="mt-2 flex justify-between text-xs text-slate">
                <span>{perDay[0]?.day}</span>
                <span>{perDay[perDay.length - 1]?.day}</span>
              </p>
            </Panel>
            <Panel title="Models that answered" description={`Average ${s.avgInputTokens ?? "—"} tokens in, ${s.avgOutputTokens ?? "—"} out.`}>
              {s.models.length === 0 ? (
                <p className="text-sm text-slate">No model answers yet.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {s.models.map((m) => (
                    <li key={m.model} className="flex items-center justify-between gap-3">
                      <span className="break-all font-mono text-xs text-ink">{m.model}</span>
                      <span className="text-xs text-slate">{m.turns}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>

          <Panel title="Latest questions" description="Timings and tools only.">
            <div className="-m-5 overflow-x-auto">
              <table className="w-full min-w-[40rem] text-sm">
                <thead>
                  <tr className="border-b border-ink/10 text-left text-xs text-slate">
                    <th scope="col" className="px-5 py-3 font-medium">When</th>
                    <th scope="col" className="px-3 py-3 font-medium">Result</th>
                    <th scope="col" className="px-3 py-3 font-medium">Model</th>
                    <th scope="col" className="px-3 py-3 font-medium">First word</th>
                    <th scope="col" className="px-3 py-3 font-medium">Full answer</th>
                    <th scope="col" className="px-5 py-3 font-medium">Tools</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink/[0.06]">
                  {recent.map((r) => (
                    <tr key={r.id} className="align-top">
                      <td className="px-5 py-3 text-xs text-slate">{formatWhen(r.at)}</td>
                      <td className="px-3 py-3">
                        <Pill tone={OUTCOME_TONE[r.outcome] ?? "neutral"}>{r.outcome}</Pill>
                        {r.finishReason === "length" && <p className="mt-1 text-xs text-critical">cut short</p>}
                      </td>
                      <td className="px-3 py-3 font-mono text-xs text-ink">
                        {r.servedModel ?? "—"}
                        {r.fallbackUsed && <span className="ml-1 text-slate">(fallback)</span>}
                      </td>
                      <td className="px-3 py-3 text-xs text-slate">{ms(r.firstTokenMs)}</td>
                      <td className="px-3 py-3 text-xs text-slate">{ms(r.totalMs)}</td>
                      <td className="px-5 py-3 text-xs text-slate">{r.tools.length ? r.tools.join(", ") : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </>
      )}
    </>
  );
}
