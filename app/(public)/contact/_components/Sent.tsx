// app/(public)/contact/_components/Sent.tsx
// Let's Talk — received: the reference (quote it if you write again), what
// happens next, and how to have it removed. No account was made.

"use client";

import { useState } from "react";
import { Check, CheckCircle2, Copy } from "lucide-react";

export function Sent({ reference, reviewSlaHours, email }: { reference: string; reviewSlaHours: number; email: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div role="status" className="rounded-3xl border border-[var(--color-signal-finished)]/25 bg-[var(--color-signal-finished)]/[0.06] p-6 md:p-10">
      <CheckCircle2 aria-hidden="true" className="text-signal-finished size-9" />
      <p className="text-ink mt-5 font-sans text-2xl font-semibold tracking-tight">Received — thank you.</p>
      <p className="text-slate mt-2 max-w-xl leading-relaxed">It&rsquo;s reviewed within {reviewSlaHours} hours, and you&rsquo;ll hear back the way you asked. Keep the reference — quote it if you write again.</p>
      <div className="border-ink/10 bg-paper mt-6 inline-flex flex-wrap items-center gap-3 rounded-2xl border px-5 py-4">
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
      <p className="text-slate mt-6 text-sm">
        No account was needed and none was made. To have this message removed, email{" "}
        <a className="text-accent font-medium underline underline-offset-4" href={`mailto:${email}`}>
          {email}
        </a>{" "}
        with the reference.
      </p>
    </div>
  );
}
