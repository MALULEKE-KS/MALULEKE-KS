// components/shared/LiveChip.tsx
// The header's live chip (D-058, the owner's U12: "the best header of all"):
// a green dot and the build that is running — "Live · 23897d1" on production,
// "Preview" on a preview build, nothing locally (Vercel's own variables). A
// hover, a tap or Enter opens the platform's vital signs: the build, the last
// GitHub sync, the rules the database enforces, the changes audited in the last
// seven days — the same figures as the footer, from the same public view, so
// the two can't disagree — and a link to how it's built (the "release" block's
// link). Gathers to "Live" in the scrolled capsule; a dot alone on a phone.
// Every word is the owner's ("site-header" block); an empty label hides its line.

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "@/components/shared/IntentLink";
import { ArrowRight } from "lucide-react";
import type { HeaderLabels } from "@/components/shared/SiteHeader";
import { cn } from "@/lib/utils";

export interface HeaderPulse {
  commit: string;
  environment: string | null;
  lastGithubSyncAt: string | null;
  rulesEnforcedByDatabase: number;
  auditEventsLast7Days: number;
}

function ago(iso: string, now: number) {
  const m = Math.max(0, Math.round((now - new Date(iso).getTime()) / 60000));
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 48) return `${h} h ago`;
  return `${Math.round(h / 24)} days ago`;
}

export function LiveChip({ pulse, labels, link }: { pulse: HeaderPulse | null; labels: HeaderLabels | null; link: string | null }) {
  const [open, setOpen] = useState(false);
  const [now, setNow] = useState<number | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const word = (s: string | undefined) => s?.trim() || null;
  const production = pulse?.environment === "production";
  const status = word(production ? labels?.liveLabel : labels?.previewLabel);

  // The card's "ago" is read on the client only, so the server's HTML never disagrees with the visitor's clock.
  useEffect(() => {
    if (open) setNow(Date.now()); // eslint-disable-line react-hooks/set-state-in-effect -- the clock is read when the card opens
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  if (!pulse || !status) return null;
  const rows: [string | null, string][] = [
    [word(labels?.vitalsBuild), pulse.commit],
    [pulse.lastGithubSyncAt && now ? word(labels?.vitalsSync) : null, pulse.lastGithubSyncAt && now ? ago(pulse.lastGithubSyncAt, now) : ""],
    [word(labels?.vitalsRules), String(pulse.rulesEnforcedByDatabase)],
    [word(labels?.vitalsAudited), pulse.auditEventsLast7Days.toLocaleString("en-ZA")],
  ];

  return (
    <div
      ref={root}
      className="relative"
      onPointerEnter={(e) => e.pointerType === "mouse" && setOpen(true)}
      onPointerLeave={(e) => e.pointerType === "mouse" && setOpen(false)}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls="live-vitals"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "tap-target inline-flex h-8 items-center gap-2 rounded-full font-mono text-xs whitespace-nowrap transition-colors",
          "sm:border sm:border-[rgb(61_220_151/0.28)] sm:bg-[rgb(61_220_151/0.08)] sm:ps-2.5 sm:pe-3 sm:text-[#c9f5e0] sm:hover:bg-[rgb(61_220_151/0.14)]",
        )}
      >
        <span aria-hidden="true" className="relative flex size-2">
          <span className="absolute inset-0 rounded-full bg-[var(--color-signal-finished-on-dark)] motion-safe:animate-ping motion-safe:[animation-duration:2.4s]" />
          <span className="relative size-2 rounded-full bg-[var(--color-signal-finished-on-dark)]" />
        </span>
        <span className="sr-only sm:not-sr-only">
          {status}
          {/* The commit, while the bar is open at the top of the page. */}
          <span className="group-data-[scrolled]/header:hidden"> · {pulse.commit}</span>
        </span>
      </button>

      {open && (
        <div
          id="live-vitals"
          role="dialog"
          aria-label={word(labels?.vitalsTitle) ?? status}
          className="bg-night text-paper shadow-lift absolute top-full left-0 z-50 mt-2 w-72 rounded-2xl border border-white/10 p-4 text-sm"
        >
          {word(labels?.vitalsTitle) && <p className="mb-2 font-medium">{labels?.vitalsTitle}</p>}
          <dl>
            {rows
              .filter(([label]) => label)
              .map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3 border-t border-white/[0.07] py-1.5">
                  <dt className="text-mist">{label}</dt>
                  <dd className="font-mono text-xs leading-5">{value}</dd>
                </div>
              ))}
          </dl>
          {link && word(labels?.vitalsLink) && (
            <Link href={link} onClick={() => setOpen(false)} className="text-ember mt-2 inline-flex items-center gap-1.5 border-t border-white/[0.07] pt-2.5 text-sm font-medium">
              {labels?.vitalsLink} <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
