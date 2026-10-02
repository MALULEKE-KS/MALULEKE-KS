// components/shared/Evidence.tsx
// The evidence a claim carries (docs/EVIDENCE-SPEC.md): a quiet chip beside
// the claim — "Evidence · 3" — that opens the proof. Overview on the page,
// detail in the sheet, the code one click further (progressive disclosure).
// EV-1: no claims → renders nothing. EV-7: status is a word and an icon, never
// colour alone; it opens on click, tap or Enter — no hover-only content. On
// phones the sheet rises from the bottom; on wider screens it's a dialog.

"use client";

import { CircleDashed, CircleDot, Clock3, ExternalLink, FileCode2, FlaskConical, GitBranch, Link2, ScrollText, ShieldCheck, Workflow, type LucideIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import type { PublicStatus, ResolvedClaim } from "@/lib/evidence";
import type { EvidenceKind } from "@/lib/evidence/schema";
import { cn } from "@/lib/utils";

const STATUS: Record<PublicStatus, { label: string; icon: LucideIcon; className: string; note?: string }> = {
  verified: { label: "Verified", icon: ShieldCheck, className: "text-[var(--color-signal-finished-on-dark)] border-[var(--color-signal-finished-on-dark)]/30 bg-[var(--color-signal-finished-on-dark)]/10" },
  partial: { label: "Partial", icon: CircleDot, className: "text-ember border-ember/30 bg-ember/10" },
  planned: { label: "Planned", icon: CircleDashed, className: "text-mist border-white/15 bg-white/5", note: "Specified, not built yet." },
  "review-due": { label: "Review due", icon: Clock3, className: "text-mist border-white/15 bg-white/5", note: "This was verified, but not recently — treat it as unconfirmed until it's reviewed again." },
};

const KIND: Record<EvidenceKind, { label: string; icon: LucideIcon }> = {
  source: { label: "Source", icon: FileCode2 },
  test: { label: "Test", icon: FlaskConical },
  route: { label: "Page", icon: Link2 },
  contract: { label: "Contract", icon: ScrollText },
  pipeline: { label: "Pipeline", icon: Workflow },
  "case-study": { label: "Case study", icon: GitBranch },
};

export function StatusBadge({ status }: { status: PublicStatus }) {
  const s = STATUS[status];
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium", s.className)}>
      <s.icon aria-hidden="true" className="size-3" />
      {s.label}
    </span>
  );
}

function ClaimCard({ c }: { c: ResolvedClaim }) {
  const note = STATUS[c.status].note;
  const reviewed = new Date(c.reviewedAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
  return (
    <article id={`evidence-${c.id}`} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex flex-wrap items-center gap-2">
        <StatusBadge status={c.status} />
        <span className="text-line text-[11px]">Reviewed {reviewed}</span>
      </div>
      <h3 className="mt-2.5 text-[15px] leading-snug font-semibold">{c.claim}</h3>
      {note && <p className="text-mist mt-1 text-xs">{note}</p>}
      <dl className="mt-3 grid gap-2 text-[13px] leading-relaxed">
        <div>
          <dt className="text-mist text-[11px] font-medium tracking-wide uppercase">What it proves</dt>
          <dd className="mt-0.5">{c.proves}</dd>
        </div>
        <div>
          <dt className="text-mist text-[11px] font-medium tracking-wide uppercase">What it doesn&rsquo;t prove</dt>
          <dd className="text-mist mt-0.5">{c.doesNotProve}</dd>
        </div>
      </dl>
      <ul className="mt-3 grid gap-1.5" aria-label="Evidence">
        {c.links.map((l) => {
          const k = KIND[l.kind];
          return (
            <li key={l.url}>
              <a
                href={l.url}
                {...(l.external && { target: "_blank", rel: "noopener noreferrer" })}
                className="group/l hover:border-ember/40 focus-visible:outline-ember flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-night/60 px-3 py-2 text-[13px] transition-colors focus-visible:outline-2"
              >
                <k.icon aria-hidden="true" className="text-ember size-4 shrink-0" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{l.label}</span>
                  <span className="text-line block text-[11px]">{k.label}</span>
                </span>
                <ExternalLink aria-hidden="true" className="text-mist group-hover/l:text-paper size-3.5 shrink-0" />
                {l.external && <span className="sr-only">(opens GitHub in a new tab)</span>}
              </a>
            </li>
          );
        })}
      </ul>
    </article>
  );
}

/**
 * The chip and its sheet. `label` names what the evidence is for (e.g. the
 * principle), so the button reads "Evidence for Smart Not Hard" to a screen reader.
 */
export function Evidence({
  claims,
  label,
  commit,
  tone = "dark",
  className,
}: {
  claims: ResolvedClaim[];
  label: string;
  commit: string | null;
  /** The surface the chip sits on; the sheet itself is always dark. */
  tone?: "dark" | "light";
  className?: string;
}) {
  if (claims.length === 0) return null; // EV-1
  const verified = claims.every((c) => c.status === "verified");
  return (
    <Dialog>
      <DialogTrigger
        className={cn(
          "hover:border-ember/40 focus-visible:outline-ember inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2",
          tone === "dark" ? "text-mist hover:text-paper border-white/12 bg-white/[0.04]" : "text-slate hover:text-ink border-ink/15 bg-ink/[0.03]",
          className,
        )}
      >
        {verified ? (
          <ShieldCheck aria-hidden="true" className={cn("size-3.5", tone === "dark" ? "text-[var(--color-signal-finished-on-dark)]" : "text-[var(--color-signal-finished)]")} />
        ) : (
          <CircleDot aria-hidden="true" className="text-ember size-3.5" />
        )}
        Evidence · {claims.length}
        <span className="sr-only"> for {label}</span>
      </DialogTrigger>
      <DialogContent className="top-auto bottom-0 max-w-xl rounded-b-none sm:top-[10vh] sm:bottom-auto sm:rounded-2xl">
        <div className="max-h-[82vh] overflow-y-auto p-5 sm:max-h-[78vh] sm:p-6">
          <p className="text-mist text-[11px] font-medium tracking-wide uppercase">Evidence</p>
          <DialogTitle className="mt-1 pr-8 text-lg font-semibold tracking-tight">{label}</DialogTitle>
          <DialogDescription className="text-mist mt-1 text-[13px]">
            {commit ? `Links open the source at build ${commit.slice(0, 7)} — the code serving this page.` : "Links open the latest source."}
          </DialogDescription>
          <div className="mt-4 grid gap-3">
            {claims.map((c) => (
              <ClaimCard key={c.id} c={c} />
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Every claim a system makes, laid out in full (the case study's Evidence
 * band) — no chip in between: on its own case study, the proof is the content.
 */
export function EvidenceList({ claims }: { claims: ResolvedClaim[] }) {
  if (claims.length === 0) return null; // EV-1
  return (
    <div className={cn("grid gap-3", claims.length > 1 && "md:grid-cols-2")}>
      {claims.map((c) => (
        <ClaimCard key={c.id} c={c} />
      ))}
    </div>
  );
}
