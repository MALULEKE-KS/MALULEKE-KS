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
  const { summary: s, perDay, recent, canary, gaps, feedback } = await loadGuideHealth(days);
  const latest = canary[0];
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

      <Panel
        title="Daily self-check"
        description="Fixed questions put through the live guide each night and checked by plain rules — not a model. A failure means a prompt, model or limit changed what the guide is."
        className="mb-6"
      >
        {!latest ? (
          <p className="text-sm text-slate">No run yet. It runs nightly at 01:30 UTC; Jobs → guide.canary runs it now.</p>
        ) : (
          <>
            <p className="flex flex-wrap items-center gap-2 text-sm text-ink">
              <Pill tone={latest.failed > 0 ? "critical" : latest.total === 0 ? "attention" : "good"}>
                {latest.total === 0 ? "could not run" : latest.failed > 0 ? `${latest.failed} failed` : "all passed"}
              </Pill>
              <span>
                {latest.passed} of {latest.total} answered correctly
                {latest.unavailable > 0 && ` · ${latest.unavailable} the guide couldn't answer (busy or resting)`}
              </span>
              <span className="text-xs text-slate">{formatWhen(latest.at)}{latest.model ? ` · ${latest.model}` : ""}</span>
            </p>
            <ul className="mt-3 grid gap-1.5 text-sm sm:grid-cols-2">
              {latest.results.map((r) => (
                <li key={r.id} className="flex items-start gap-2">
                  <Pill tone={r.pass === true ? "good" : r.pass === false ? "critical" : "neutral"}>{r.pass === true ? "pass" : r.pass === false ? "fail" : "n/a"}</Pill>
                  <span className="min-w-0">
                    <span className="font-mono text-xs text-ink">{r.id}</span>
                    {r.problems.length > 0 && <span className="block break-words text-xs text-slate">{r.problems.join("; ")}</span>}
                  </span>
                </li>
              ))}
            </ul>
            {canary.length > 1 && (
              <p className="mt-3 text-xs text-slate">
                Earlier runs: {canary.slice(1).map((r) => `${r.at.slice(5, 10)} ${r.failed > 0 ? `✗${r.failed}` : r.total === 0 ? "–" : "✓"}`).join(" · ")}
              </p>
            )}
          </>
        )}
      </Panel>

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
            <Stat label="Claims checked against the site" value={s.claimsChecked} />
            <Stat label="Claims the site doesn't contain" value={`${s.claimsFlagged} · ${pct(s.answersFlaggedShare)} of answers`} tone={s.answersFlaggedShare > 0.1 ? "attention" : "neutral"} />
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

          <Panel
            title="What the site couldn't answer"
            description="Questions the guide couldn't answer from the site's data, or answered with something the data doesn't contain — contact details removed, nothing that says who asked. Each is a gap to close in Page content, Systems or Journey."
            className="mb-6"
          >
            {gaps.length === 0 ? (
              <p className="text-sm text-slate">None in this window — or the setting concierge.logRetentionDays is 0, which keeps no question text.</p>
            ) : (
              <ul className="divide-y divide-ink/[0.06]">
                {gaps.map((g) => (
                  <li key={g.id} className="flex flex-wrap items-start justify-between gap-2 py-2.5 first:pt-0 last:pb-0">
                    <span className="min-w-0 max-w-2xl break-words text-sm text-ink">{g.question}</span>
                    <span className="flex shrink-0 items-center gap-2 text-xs text-slate">
                      <Pill tone={g.reason === "unverified" ? "attention" : "neutral"}>{g.reason === "unverified" ? "answered beyond the data" : "couldn't answer"}</Pill>
                      {g.page && <span className="font-mono">{g.page}</span>}
                      <span>{formatWhen(g.at)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title="What visitors said about answers"
            description={`${feedback.wrong} marked wrong · ${feedback.helpful} helpful. Each is a visitor's own report, with the question and the answer's opening (contact details removed, nothing that says who sent it). A wrong one is a candidate for a new test case.`}
            className="mb-6"
          >
            {feedback.recent.length === 0 ? (
              <p className="text-sm text-slate">Nothing yet — or concierge.logRetentionDays is 0, which keeps no visitor text.</p>
            ) : (
              <ul className="divide-y divide-ink/[0.06]">
                {feedback.recent.map((f) => (
                  <li key={f.id} className="space-y-1 py-3 first:pt-0 last:pb-0">
                    <p className="flex flex-wrap items-center gap-2 text-xs text-slate">
                      <Pill tone={f.rating === "wrong" ? "critical" : "good"}>{f.rating === "wrong" ? "wrong" : "helpful"}</Pill>
                      {f.page && <span className="font-mono">{f.page}</span>}
                      <span>{formatWhen(f.at)}</span>
                    </p>
                    <p className="break-words text-sm text-ink">{f.question}</p>
                    <p className="break-words text-xs text-slate">{f.answer}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

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
