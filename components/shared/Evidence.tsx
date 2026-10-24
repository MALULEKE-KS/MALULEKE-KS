// components/shared/Evidence.tsx
// The evidence a claim carries (docs/EVIDENCE-SPEC.md): a quiet chip beside
// the claim — "Evidence ↗" over a hairline (D-047; it was a chip) — that opens
// the proof. Overview on the page, a preview on hover (CSS, D-063: the claim
// and what it proves), detail in the sheet, the code one click further
// (progressive disclosure). EV-1: no claims → renders nothing. EV-7: status is
// a word and an icon, never colour alone; it opens on click, tap or Enter — the
// hover preview only repeats what the sheet shows, it is never the only way in.
// On phones the sheet rises from the bottom; on wider screens it's a dialog.

"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { ArrowUpRight, CircleDot, ShieldCheck } from "lucide-react";
import type { ResolvedClaim } from "@/lib/evidence";
import { ClaimCard, StatusBadge } from "@/components/shared/EvidenceClaim";
import { cn } from "@/lib/utils";

const loadSheet = () => import("@/components/shared/EvidenceSheet");
const EvidenceSheet = dynamic(loadSheet, { ssr: false });
const preload = () => void loadSheet();

export { StatusBadge };

/**
 * The chip and its sheet. `label` names what the evidence is for (e.g. the
 * principle), so the button reads "Evidence for Smart Not Hard" to a screen reader.
 * The chip is a plain button; its preview is CSS (pointer or focus, wider screens);
 * the sheet is fetched the first time it opens (D-063).
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
  const [open, setOpen] = useState(false);
  const [wanted, setWanted] = useState(false);
  if (claims.length === 0) return null; // EV-1
  const verified = claims.every((c) => c.status === "verified");
  const first = claims[0]!;
  const sources = claims.reduce((n, c) => n + c.links.length, 0);
  return (
    <span className="group/evw relative inline-flex">
      <button
        type="button"
        aria-haspopup="dialog"
        onPointerEnter={preload}
        onFocus={preload}
        onClick={() => {
          setWanted(true);
          setOpen(true);
        }}
        className={cn(
          "group/ev tap-target press focus-visible:outline-ember inline-flex items-center gap-1.5 border-b border-dashed pb-0.5 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-4",
          tone === "dark" ? "text-paper/90 hover:text-paper hover:border-ember border-white/30" : "text-ink/85 hover:text-ink hover:border-ember border-ink/30",
          className,
        )}
      >
        {verified ? (
          <ShieldCheck aria-hidden="true" className={cn("size-3.5", tone === "dark" ? "text-[var(--color-signal-finished-on-dark)]" : "text-[var(--color-signal-finished)]")} />
        ) : (
          <CircleDot aria-hidden="true" className="text-ember size-3.5" />
        )}
        Evidence{claims.length > 1 && <span className="text-mist font-normal tabular-nums">· {claims.length}</span>}
        <ArrowUpRight aria-hidden="true" className="size-3.5 transition-transform duration-200 group-hover/ev:-translate-y-0.5 group-hover/ev:translate-x-0.5 motion-reduce:transition-none" />
        <span className="sr-only"> for {label}</span>
      </button>
      {/* The preview: what the sheet opens with, on pointer or focus, from a tablet up — CSS only, never the only way in (EV-7). */}
      <span
        aria-hidden="true"
        className="bg-night text-paper shadow-lift pointer-events-none absolute bottom-full left-0 z-40 mb-2 hidden w-72 rounded-2xl border border-white/10 p-4 opacity-0 transition-opacity delay-200 duration-150 sm:block sm:invisible sm:group-focus-within/evw:visible sm:group-focus-within/evw:opacity-100 sm:group-hover/evw:visible sm:group-hover/evw:opacity-100"
      >
        <StatusBadge status={first.status} />
        <span className="mt-2.5 block text-[14px] leading-snug font-semibold">{first.claim}</span>
        <span className="text-mist mt-1.5 line-clamp-3 block text-[13px] leading-relaxed">{first.proves}</span>
        <span className="text-line mt-3 block font-mono text-[11px]">
          {sources} {sources === 1 ? "source" : "sources"}
          {claims.length > 1 && ` · ${claims.length - 1} more ${claims.length === 2 ? "claim" : "claims"}`} · click to open
        </span>
      </span>
      {(open || wanted) && <EvidenceSheet open={open} onOpenChange={setOpen} claims={claims} label={label} commit={commit} />}
    </span>
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
