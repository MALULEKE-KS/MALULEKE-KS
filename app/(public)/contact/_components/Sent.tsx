// app/(public)/contact/_components/Sent.tsx
// Let's Talk — received: the reference (quote it if you write again), what
// happens next as the same steps the hero promised — the done ones ticked —
// and how to have it removed. No account was made. The check draws itself and
// a few embers rise from it (CSS only; still under reduced motion).

"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { ShineBorder } from "@/components/ui/shine-border";
import { cn } from "@/lib/utils";

// Where each ember goes — fixed, so server and client draw the same.
const EMBERS = [
  { dx: "-46px", dy: "-58px", d: "0ms" },
  { dx: "-18px", dy: "-74px", d: "60ms" },
  { dx: "14px", dy: "-80px", d: "20ms" },
  { dx: "44px", dy: "-62px", d: "90ms" },
  { dx: "60px", dy: "-28px", d: "40ms" },
  { dx: "-62px", dy: "-24px", d: "110ms" },
];

export function Sent({ reference, reviewSlaHours, email, steps }: { reference: string; reviewSlaHours: number; email: string; steps: { title: string; body?: string }[] }) {
  const [copied, setCopied] = useState(false);
  return (
    <div role="status" className="bg-paper relative overflow-hidden rounded-3xl border border-[var(--color-signal-finished)]/25 p-6 md:p-10">
      <ShineBorder borderWidth={1.5} duration={12} />
      <div aria-hidden="true" className="pointer-events-none absolute -top-24 -left-24 size-72 rounded-full bg-[radial-gradient(closest-side,rgb(255_91_31/0.12),transparent)]" />

      <span aria-hidden="true" className="relative grid size-14 place-items-center">
        <span className="bg-signal-finished/15 absolute inset-0 rounded-full" />
        <svg viewBox="0 0 24 24" className="text-signal-finished relative size-8" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5l4.5 4.5L19 7.5" pathLength={1} strokeDasharray={1} className="motion-safe:animate-[draw-check_520ms_cubic-bezier(0.65,0,0.35,1)_180ms_both]" />
        </svg>
        {EMBERS.map((e, i) => (
          <span
            key={i}
            className="bg-ember absolute top-1/2 left-1/2 size-1.5 rounded-full opacity-0 motion-safe:animate-[ember-rise_1100ms_ease-out_both] motion-reduce:hidden"
            style={{ "--dx": e.dx, "--dy": e.dy, animationDelay: `calc(600ms + ${e.d})` } as React.CSSProperties}
          />
        ))}
      </span>

      <p className="text-ink relative mt-6 font-sans text-2xl font-semibold tracking-tight md:text-3xl">Received — thank you.</p>
      <p className="text-slate relative mt-2 max-w-xl leading-relaxed">
        It&rsquo;s reviewed within {reviewSlaHours} hours, and you&rsquo;ll hear back the way you asked. Keep the reference — quote it if you write again.
      </p>

      <div className="border-ink/10 bg-sheet relative mt-6 inline-flex flex-wrap items-center gap-3 rounded-2xl border px-5 py-4">
        <span className="text-slate text-xs tracking-wide uppercase">Reference</span>
        <span className="type-data text-ink text-xl font-semibold tracking-wider">{reference}</span>
        <button
          type="button"
          onClick={() => void navigator.clipboard?.writeText(reference).then(() => setCopied(true))}
          className="text-slate hover:text-ink focus-visible:outline-ember inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm focus-visible:outline-2"
        >
          {copied ? <Check aria-hidden="true" className="size-4" /> : <Copy aria-hidden="true" className="size-4" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {steps.length > 0 && (
        // The hero's promise, kept: the first two steps are done now.
        <ol aria-label="What happens next" className="relative mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => {
            const done = i < 2;
            return (
              <li key={s.title} className={cn("rounded-2xl border p-4", done ? "border-[var(--color-signal-finished)]/25 bg-[var(--color-signal-finished)]/[0.06]" : "border-ink/10 bg-sheet")}>
                <span className={cn("grid size-6 place-items-center rounded-full font-mono text-[11px]", done ? "bg-signal-finished text-paper" : i === 2 ? "bg-ember text-ink" : "border-ink/15 text-slate border")}>
                  {done ? <Check aria-hidden="true" className="size-3.5" /> : i + 1}
                </span>
                <span className="text-ink mt-2 block text-sm font-semibold">
                  {s.title}
                  <span className="sr-only">{done ? " — done" : i === 2 ? " — next" : ""}</span>
                </span>
                {s.body && <span className="text-slate mt-0.5 block text-xs leading-snug">{s.body}</span>}
              </li>
            );
          })}
        </ol>
      )}

      <p className="text-slate relative mt-8 text-sm">
        No account was needed and none was made. To have this message removed, email{" "}
        <a className="text-accent font-medium underline underline-offset-4" href={`mailto:${email}`}>
          {email}
        </a>{" "}
        with the reference.
      </p>
    </div>
  );
}
