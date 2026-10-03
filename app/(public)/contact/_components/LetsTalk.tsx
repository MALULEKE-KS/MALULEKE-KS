// app/(public)/contact/_components/LetsTalk.tsx
// Let's Talk (docs/LETS-TALK-SPEC.md) — the conversation, composed:
//   choose  → CategoryPicker ("What brings you here?")
//   fill    → the parts that category needs, numbered — What it is, pay,
//             meeting, You, Documents — beside a rail that ticks each part
//             off as it's complete and jumps to it
//   sent    → the reference
// State, validation and sending live in use-inquiry-form.ts; what each
// category asks lives in lib/inquiries/fields.ts; the rules are
// lib/inquiries/forms.ts, run here for guidance and on the server as the
// authority. The page's own notes (email, privacy) arrive as `aside`.

"use client";

import { useId, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { InquiryTypeOption } from "@/lib/queries/site";
import { cn } from "@/lib/utils";
import { CATEGORY_ICON, CategoryPicker } from "./CategoryPicker";
import { DocumentsSection } from "./DocumentsSection";
import { MeetingSection } from "./MeetingSection";
import { PaySection } from "./PaySection";
import { Sent } from "./Sent";
import { WhatSection } from "./WhatSection";
import { YouSection } from "./YouSection";
import { useInquiryForm } from "./use-inquiry-form";

interface Props {
  categories: InquiryTypeOption[];
  initialCategory: string | null;
  email: string;
  ownerFirstName: string;
  reviewSlaHours: number;
  retentionMonths: number;
  documents: { maxFiles: number; maxMegabytes: number };
  /** The picker's heading — page copy, from data. */
  picker: { title: string; description: string | null };
  aside: React.ReactNode;
}

export function LetsTalk({ categories, initialCategory, email, ownerFirstName, reviewSlaHours, retentionMonths, documents, picker, aside }: Props) {
  const uid = useId();
  const reduced = useReducedMotion();
  const top = useRef<HTMLDivElement>(null);
  const f = useInquiryForm({ categories, initialCategory, maxFiles: documents.maxFiles, maxMegabytes: documents.maxMegabytes });
  const scrollTop = () => requestAnimationFrame(() => top.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" }));

  const choose = (key: string | null) => {
    f.choose(key);
    scrollTop();
  };
  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (await f.submit()) scrollTop();
    else requestAnimationFrame(() => document.querySelector<HTMLElement>("#inquiry-form [aria-invalid=true]")?.focus());
  }

  // Steps are numbered by what this category actually shows.
  const steps = [...f.progress, ...(documents.maxFiles > 0 ? [{ key: "documents", label: "Documents", done: f.files.length > 0 }] : [])];
  const stepOf = (key: string) => steps.findIndex((s) => s.key === key) + 1;
  const required = f.progress;
  const ready = required.filter((s) => s.done).length;
  const filling = f.chosen && f.state.kind !== "sent";

  let body: React.ReactNode;
  if (f.state.kind === "sent") body = <Sent reference={f.state.reference} reviewSlaHours={reviewSlaHours} email={email} />;
  else if (!f.chosen) body = <CategoryPicker categories={categories} fromGuide={f.fromGuide} onChoose={choose} title={picker.title} description={picker.description} />;
  else {
    const Icon = CATEGORY_ICON[f.form];
    body = (
      <>
        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => choose(null)} className="text-slate hover:text-ink focus-visible:outline-ember inline-flex items-center gap-1.5 rounded-full text-sm focus-visible:outline-2 focus-visible:outline-offset-2">
            <ArrowLeft aria-hidden="true" className="size-4" /> Change
          </button>
          <span className="bg-ink text-paper inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm">
            <Icon aria-hidden="true" className="text-ember size-4" /> {f.chosen.label}
          </span>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          <motion.form
            key={f.chosen.value}
            id="inquiry-form"
            onSubmit={onSubmit}
            noValidate
            initial={reduced ? false : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-8 space-y-10"
          >
            {f.fromGuide && (
              <p role="status" className="border-ember/30 bg-ember/10 rounded-xl border px-4 py-3 text-sm">
                The AI guide drafted your message below. Read it, change anything, add your details — nothing is sent until you press send.
              </p>
            )}
            {/* Honeypot — off-screen, never focusable or announced (BR-2.7). */}
            <div className="absolute -left-[9999px]" aria-hidden="true">
              <label htmlFor={`${uid}-website`}>Website</label>
              <input id={`${uid}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" value={f.website} onChange={(e) => f.setWebsite(e.target.value)} />
            </div>

            <WhatSection f={f} uid={uid} step={stepOf("what")} ownerFirstName={ownerFirstName} />
            <PaySection f={f} uid={uid} step={stepOf("pay")} />
            <MeetingSection f={f} uid={uid} step={stepOf("meeting")} />
            <YouSection f={f} uid={uid} step={stepOf("you")} />
            <DocumentsSection f={f} uid={uid} step={stepOf("documents")} maxFiles={documents.maxFiles} maxMegabytes={documents.maxMegabytes} />

            <div className="border-ink/10 space-y-4 border-t pt-8">
              <p className="text-slate text-xs leading-relaxed">
                Your details are used only to reply to this message. They&rsquo;re kept for {retentionMonths} months, then anonymised automatically; to have them removed sooner, email{" "}
                <a className="text-accent underline underline-offset-4" href={`mailto:${email}`}>
                  {email}
                </a>
                . No account is created.
              </p>
              <div aria-live="polite">{f.state.kind === "problem" && <p className="text-critical text-sm">{f.state.message}</p>}</div>
              <Button type="submit" variant="accent" size="lg" disabled={f.state.kind === "sending"} className="w-full sm:w-auto">
                {f.state.kind === "sending" ? (
                  <>
                    <Loader2 className="animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    Send
                    <ArrowRight />
                  </>
                )}
              </Button>
            </div>
          </motion.form>
        </AnimatePresence>
      </>
    );
  }

  return (
    <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
      <div ref={top} className="border-ink/10 bg-sheet shadow-soft min-w-0 scroll-mt-24 rounded-3xl border p-5 sm:p-8 md:p-10 lg:col-span-8">
        {body}
      </div>
      <aside className="min-w-0 space-y-5 lg:sticky lg:top-24 lg:col-span-4">
        {filling && (
          <nav aria-label="Your progress" className="bg-night text-paper shadow-lift rounded-2xl border border-white/10 p-6">
            <p className="flex items-baseline justify-between gap-3">
              <span className="font-sans text-base font-semibold">Your message</span>
              <span className="text-mist font-mono text-xs">
                {ready} / {required.length} ready
              </span>
            </p>
            <div aria-hidden="true" className="mt-3 h-1 overflow-hidden rounded-full bg-white/10">
              <div className="bg-ember h-full rounded-full transition-[width] duration-500" style={{ width: `${(ready / required.length) * 100}%` }} />
            </div>
            <ol className="mt-5 space-y-1">
              {steps.map((s, i) => (
                <li key={s.key}>
                  <a href={`#part-${s.key}`} className="flex items-center gap-3 rounded-xl px-2 py-1.5 text-sm transition-colors hover:bg-white/5">
                    <span className={cn("grid size-6 shrink-0 place-items-center rounded-full font-mono text-[11px] transition-colors", s.done ? "bg-signal-finished text-paper" : "border border-white/20 text-mist")}>
                      {s.done ? <Check aria-hidden="true" className="size-3.5" /> : i + 1}
                    </span>
                    <span className={s.done ? "text-paper" : "text-mist"}>{s.label}</span>
                    {s.key === "documents" && <span className="text-line ml-auto text-xs">optional</span>}
                    <span className="sr-only">{s.done ? " — done" : ""}</span>
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        )}
        {aside}
      </aside>
    </div>
  );
}
