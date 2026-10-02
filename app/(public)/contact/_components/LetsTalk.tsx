// app/(public)/contact/_components/LetsTalk.tsx
// Let's Talk (docs/LETS-TALK-SPEC.md): "What brings you here?" — a choice of
// large tiles, then a form shaped to the answer, then the reference. Simple in
// front, structured underneath:
//   - each category asks only its own questions (LT-1, LT-2); "Other" always
//     opens a box to describe it
//   - compensation is a choice — a range, "prefer to discuss", or unpaid —
//     never guessed from a blank (LT-4)
//   - a meeting already arranged keeps its own time zone (LT-5)
//   - PDFs only, checked here for guidance and again by their bytes on the
//     server (LT-8)
//   - the same rules (lib/inquiries/forms.ts) run here and on the server; the
//     server's answer is the one that counts
//   - a hidden honeypot, a signed form token (fill-time check), and one
//     idempotency key per message, so a double tap is one inquiry (BR-2.6/2.7)
// The AI guide's draft (BR-4.1/4.2) only fills the message; the visitor sends it.

"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowRight, Briefcase, Check, CheckCircle2, Code2, Copy, FileText, Handshake, Loader2, MessageCircle, Paperclip, Sparkles, TrendingUp, X, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { INQUIRY_DRAFT_KEY } from "@/lib/guide/keys";
import { CATEGORY_FORMS, CHANNELS, COMPENSATION_STRUCTURES, Contact, MEETING_KINDS, type CategoryKey } from "@/lib/inquiries/forms";
import type { InquiryTypeOption } from "@/lib/queries/site";
import { cn } from "@/lib/utils";

const ICON: Record<CategoryKey, LucideIcon> = { recruitment: Briefcase, service: Code2, collaboration: Handshake, growth: TrendingUp, general: MessageCircle };

// What the main message is called, per form — the one field every category shares.
const MESSAGE_LABEL: Record<CategoryKey, { label: string; hint: string }> = {
  recruitment: { label: "About the role", hint: "Responsibilities, requirements, the team — paste the job description if you have it." },
  service: { label: "About the project", hint: "The problem, what it should do, and anything that already exists." },
  collaboration: { label: "About the idea", hint: "What you're building, why, and where it stands." },
  growth: { label: "About the business", hint: "What you do, who for, and where you want to grow." },
  general: { label: "Your message", hint: "Whatever you'd like to say or ask." },
};

const FIELD =
  "w-full rounded-xl border border-ink/15 bg-paper px-4 py-3 font-sans text-base text-ink shadow-inset-hair outline-none transition-[border-color,box-shadow] placeholder:text-slate/70 focus:border-ember focus:ring-4 focus:ring-ember/15 aria-[invalid=true]:border-critical";
const CHIP = (on: boolean) =>
  cn(
    "rounded-full border px-3.5 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember",
    on ? "border-ink bg-ink text-paper" : "border-ink/15 bg-paper text-slate hover:border-ink/35 hover:text-ink",
  );
const CURRENCIES = ["ZAR", "USD", "EUR", "GBP"];
const CHANNEL_LABEL: Record<(typeof CHANNELS)[number], string> = { email: "Email", phone: "Phone call", whatsapp: "WhatsApp", sms: "SMS", other: "Other" };

/** A form token older than an hour is swapped for a fresh one before sending. */
const tokenIsStale = (t: { at: number } | null) => !t || Date.now() - t.at > 60 * 60 * 1000;

type Errors = Record<string, string>;
type State = { kind: "form" } | { kind: "sending" } | { kind: "sent"; reference: string } | { kind: "problem"; message: string };

function Field({ id, label, error, hint, optional, children }: { id: string; label: string; error?: string; hint?: string; optional?: boolean; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="text-ink mb-2 block text-sm font-medium">
        {label}
        {optional && <span className="text-slate font-normal"> (optional)</span>}
      </label>
      {children}
      {hint && !error && <p className="text-slate mt-1.5 text-xs">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="text-critical mt-1.5 text-sm">
          {error}
        </p>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="border-ink/10 min-w-0 space-y-5 border-t pt-7 first:border-t-0 first:pt-0">
      <legend className="text-ink float-left mb-5 w-full font-sans text-base font-semibold">{title}</legend>
      <div className="clear-both space-y-5">{children}</div>
    </fieldset>
  );
}

interface Props {
  categories: InquiryTypeOption[];
  initialCategory: string | null;
  email: string;
  reviewSlaHours: number;
  retentionMonths: number;
  documents: { maxFiles: number; maxMegabytes: number };
}

export function LetsTalk({ categories, initialCategory, email, reviewSlaHours, retentionMonths, documents }: Props) {
  const uid = useId();
  const reduced = useReducedMotion();
  const top = useRef<HTMLDivElement>(null);
  const [category, setCategory] = useState<string | null>(categories.some((c) => c.value === initialCategory) ? initialCategory : null);
  const chosen = categories.find((c) => c.value === category) ?? null;
  const form: CategoryKey = chosen?.form ?? "general";

  // Shared fields.
  const [subtype, setSubtype] = useState("");
  const [subtypeOther, setSubtypeOther] = useState("");
  const [message, setMessage] = useState("");
  const [contact, setContact] = useState({ name: "", email: "", phone: "", organization: "", role: "", organizationWebsite: "", profileUrl: "", preferredChannel: "email" as (typeof CHANNELS)[number], preferredChannelOther: "" });
  // The category's own fields, kept per form so switching back doesn't lose them.
  const [details, setDetails] = useState<Record<string, string>>({});
  const [comp, setComp] = useState({ mode: "", structure: "annual", currency: "ZAR", min: "", max: "", negotiable: false, note: "" });
  const browserZone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "";
    }
  }, []);
  const [meeting, setMeeting] = useState({ status: "none", kind: "hr", startsAtLocal: "", timeZone: "", durationMinutes: "", location: "", link: "", contactPerson: "", instructions: "" });
  const [files, setFiles] = useState<File[]>([]);
  const [website, setWebsite] = useState(""); // honeypot
  const [errors, setErrors] = useState<Errors>({});
  const [state, setState] = useState<State>({ kind: "form" });
  const [fromGuide, setFromGuide] = useState(false);
  const [copied, setCopied] = useState(false);
  const idempotencyKey = useRef<string | null>(null);
  const token = useRef<{ value: string; at: number } | null>(null);

  async function fetchToken() {
    try {
      const res = await fetch("/api/v1/inquiries/form", { cache: "no-store" });
      const data = (await res.json()) as { token: string };
      token.current = { value: data.token, at: Date.now() };
    } catch {
      token.current = null;
    }
  }

  useEffect(() => {
    void fetchToken();
    try {
      const draft = sessionStorage.getItem(INQUIRY_DRAFT_KEY);
      if (!draft) return;
      sessionStorage.removeItem(INQUIRY_DRAFT_KEY);
      /* eslint-disable react-hooks/set-state-in-effect -- reading the session once, after hydration */
      setMessage((current) => current || draft);
      setFromGuide(true);
      /* eslint-enable react-hooks/set-state-in-effect */
    } catch {
      // Storage blocked: nothing to prefill.
    }
  }, []);

  const scrollTop = () => top.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "start" });
  const choose = (key: string | null) => {
    setCategory(key);
    setSubtype("");
    setSubtypeOther("");
    setErrors({});
    setState({ kind: "form" });
    // A new message, a new key (BR-2.6).
    idempotencyKey.current = null;
    requestAnimationFrame(scrollTop);
  };

  const formShape = CATEGORY_FORMS[form];
  const hasComp = form !== "general";
  const hasMeeting = form === "recruitment" || form === "service" || form === "collaboration";
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setDetails((d) => ({ ...d, [`${form}.${k}`]: e.target.value }));
  const val = (k: string) => details[`${form}.${k}`] ?? "";
  const err = (k: string) => errors[k];
  const aria = (k: string) => ({ "aria-invalid": Boolean(err(k)), "aria-describedby": err(k) ? `${uid}-${k}-error` : undefined });

  function buildDetails(): Record<string, unknown> {
    const out: Record<string, unknown> = {};
    const keys: Record<CategoryKey, string[]> = {
      recruitment: ["jobTitle", "seniority", "representation", "representationNote", "workArrangement", "workArrangementNote", "location", "startDate", "applicationDeadline"],
      service: ["projectName", "desiredOutcome", "existingSystem", "timeline"],
      collaboration: ["projectName", "stage", "expectedContribution", "commitment"],
      growth: ["objective", "targetAudience", "currentPresence", "timeline"],
      general: [],
    };
    for (const k of keys[form]) if (val(k).trim()) out[k] = val(k).trim();
    if (hasComp) {
      out.compensation =
        comp.mode === "range"
          ? {
              mode: "range",
              structure: comp.structure,
              ...(["annual", "monthly", "hourly", "daily", "project"].includes(comp.structure) && { currency: comp.currency }),
              ...(comp.min !== "" && { min: Number(comp.min) }),
              ...(comp.max !== "" && { max: Number(comp.max) }),
              ...(comp.negotiable && { negotiable: true }),
              ...(comp.note.trim() && { note: comp.note.trim() }),
            }
          : comp.mode
            ? { mode: comp.mode, ...(comp.note.trim() && { note: comp.note.trim() }) }
            : {};
    }
    if (hasMeeting) {
      out.meeting =
        meeting.status === "scheduled"
          ? {
              status: "scheduled",
              kind: meeting.kind,
              startsAtLocal: meeting.startsAtLocal,
              timeZone: meeting.timeZone || browserZone,
              ...(meeting.durationMinutes && { durationMinutes: Number(meeting.durationMinutes) }),
              ...(meeting.location.trim() && { location: meeting.location.trim() }),
              ...(meeting.link.trim() && { link: meeting.link.trim() }),
              ...(meeting.contactPerson.trim() && { contactPerson: meeting.contactPerson.trim() }),
              ...(meeting.instructions.trim() && { instructions: meeting.instructions.trim() }),
            }
          : { status: meeting.status };
    }
    return out;
  }

  function collect(issues: { path: PropertyKey[]; message: string }[], prefix = ""): Errors {
    const out: Errors = {};
    for (const i of issues) {
      const key = prefix + i.path.map(String).join(".");
      if (!out[key]) out[key] = i.message;
    }
    return out;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!chosen) return;
    const next: Errors = {};
    const c = Contact.safeParse(contact);
    if (!c.success) Object.assign(next, collect(c.error.issues));
    const d = formShape.safeParse(buildDetails());
    if (!d.success) Object.assign(next, collect(d.error.issues, "details."));
    if (message.trim().length < 20) next.message = "Write at least 20 characters";
    if (message.length > 5000) next.message = "Keep it under 5,000 characters";
    if (chosen.subtypes?.length && !subtype) next.subtype = "Choose one";
    if (subtype === "other" && !subtypeOther.trim()) next.subtypeOther = "Describe what it is";
    const maxBytes = documents.maxMegabytes * 1024 * 1024;
    if (files.reduce((n, f) => n + f.size, 0) > maxBytes) next.documents = `Attachments can total at most ${documents.maxMegabytes} MB`;
    setErrors(next);
    if (Object.keys(next).length > 0) {
      requestAnimationFrame(() => document.querySelector<HTMLElement>("[aria-invalid=true]")?.focus());
      return;
    }

    setState({ kind: "sending" });
    idempotencyKey.current ??= crypto.randomUUID();
    if (tokenIsStale(token.current)) await fetchToken();
    const payload = {
      inquiryType: chosen.value,
      ...(subtype && { subtype }),
      ...(subtype === "other" && { subtypeOther: subtypeOther.trim() }),
      ...Object.fromEntries(Object.entries(contact).filter(([, v]) => v !== "")),
      message,
      details: buildDetails(),
      idempotencyKey: idempotencyKey.current,
      formToken: token.current?.value,
      website,
    };
    const send = () => {
      if (files.length === 0) return fetch("/api/v1/inquiries", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const fd = new FormData();
      fd.set("payload", JSON.stringify(payload));
      for (const f of files) fd.append("documents", f);
      return fetch("/api/v1/inquiries", { method: "POST", body: fd });
    };
    try {
      let res = await send();
      if (res.status === 400) {
        const body = (await res.clone().json().catch(() => null)) as { error?: { code?: string } } | null;
        if (body?.error?.code === "FORM_EXPIRED") {
          await fetchToken();
          payload.formToken = token.current?.value;
          res = await send();
        }
      }
      const data = (await res.json().catch(() => null)) as { reference?: string; error?: { message?: string; details?: { issues?: { path: PropertyKey[]; message: string }[] } } } | null;
      if (res.ok && data?.reference) {
        setState({ kind: "sent", reference: data.reference });
        requestAnimationFrame(scrollTop);
        return;
      }
      if (res.status === 400 && data?.error?.details?.issues) setErrors(collect(data.error.details.issues));
      setState({
        kind: "problem",
        message: res.status === 429 ? (data?.error?.message ?? "Too many messages — try again later.") : res.status === 413 ? "The attachments are too large." : (data?.error?.message ?? "Something went wrong. Try again."),
      });
    } catch {
      setState({ kind: "problem", message: "Couldn't reach the site — check your connection and try again. Nothing was sent twice." });
    }
  }

  // ─── Sent ───────────────────────────────────────────────────────────
  if (state.kind === "sent") {
    return (
      <div ref={top} role="status" className="scroll-mt-28 rounded-3xl border border-[var(--color-signal-finished)]/25 bg-[var(--color-signal-finished)]/[0.06] p-6 md:p-10">
        <CheckCircle2 aria-hidden="true" className="text-signal-finished size-9" />
        <p className="text-ink mt-5 font-sans text-2xl font-semibold tracking-tight">Received — thank you.</p>
        <p className="text-slate mt-2 max-w-xl leading-relaxed">It&rsquo;s reviewed within {reviewSlaHours} hours, and you&rsquo;ll hear back the way you asked. Keep the reference — quote it if you write again.</p>
        <div className="mt-6 inline-flex flex-wrap items-center gap-3 rounded-2xl border border-ink/10 bg-paper px-5 py-4">
          <span className="text-slate text-xs tracking-wide uppercase">Reference</span>
          <span className="type-data text-ink text-xl font-semibold tracking-wider">{state.reference}</span>
          <button
            type="button"
            onClick={() => {
              void navigator.clipboard?.writeText(state.reference).then(() => setCopied(true));
            }}
            className="text-slate hover:text-ink inline-flex items-center gap-1 rounded-full px-2 py-1 text-sm focus-visible:outline-2 focus-visible:outline-ember"
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

  // ─── Step 1: What brings you here? ──────────────────────────────────
  if (!chosen) {
    return (
      <div ref={top} className="scroll-mt-28">
        {fromGuide && (
          <p role="status" className="border-ember/30 bg-ember/10 mb-6 flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm">
            <Sparkles aria-hidden="true" className="text-accent mt-0.5 size-4 shrink-0" />
            The AI guide drafted your message — choose what it&rsquo;s about, then read it and add your details. Nothing is sent until you press send.
          </p>
        )}
        <h2 className="text-ink font-sans text-2xl font-semibold tracking-tight md:text-3xl">What brings you here?</h2>
        <p className="text-slate mt-2">Pick the closest — the form asks only what that needs.</p>
        <ul className="mt-8 grid gap-3 sm:grid-cols-2">
          {categories.map((c, i) => {
            const Icon = ICON[c.form ?? "general"];
            return (
              <li key={c.value} className={cn(i === categories.length - 1 && categories.length % 2 === 1 && "sm:col-span-2")}>
                <button
                  type="button"
                  onClick={() => choose(c.value)}
                  className="group/tile border-ink/10 bg-paper hover:border-ember/50 focus-visible:outline-ember shadow-soft flex h-full w-full items-start gap-4 rounded-2xl border p-5 text-left transition-[border-color,transform] focus-visible:outline-2 focus-visible:outline-offset-2 motion-safe:hover:-translate-y-0.5"
                >
                  <span className="bg-ink text-paper group-hover/tile:bg-ember group-hover/tile:text-ink grid size-11 shrink-0 place-items-center rounded-xl transition-colors">
                    <Icon aria-hidden="true" className="size-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="text-ink block font-sans text-base font-semibold">{c.label}</span>
                    {c.description && <span className="text-slate mt-1 block text-sm leading-snug">{c.description}</span>}
                  </span>
                  <ArrowRight aria-hidden="true" className="text-slate group-hover/tile:text-ink mt-1 size-4 shrink-0 transition-transform group-hover/tile:translate-x-0.5" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    );
  }

  // ─── Step 2: the form shaped to the choice ──────────────────────────
  const Icon = ICON[form];
  const msg = MESSAGE_LABEL[form];
  return (
    <div ref={top} className="scroll-mt-28">
      <div className="flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => choose(null)} className="text-slate hover:text-ink focus-visible:outline-ember inline-flex items-center gap-1.5 rounded-full text-sm focus-visible:outline-2 focus-visible:outline-offset-2">
          <ArrowLeft aria-hidden="true" className="size-4" /> Change
        </button>
        <span className="bg-ink text-paper inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm">
          <Icon aria-hidden="true" className="text-ember size-4" /> {chosen.label}
        </span>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.form
          key={chosen.value}
          id="inquiry-form"
          onSubmit={submit}
          noValidate
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="mt-8 space-y-9"
        >
          {fromGuide && (
            <p role="status" className="border-ember/30 bg-ember/10 rounded-xl border px-4 py-3 text-sm">
              The AI guide drafted your message below. Read it, change anything, add your details — nothing is sent until you press send.
            </p>
          )}
          {/* Honeypot — off-screen, never focusable or announced (BR-2.7). */}
          <div className="absolute -left-[9999px]" aria-hidden="true">
            <label htmlFor={`${uid}-website`}>Website</label>
            <input id={`${uid}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" value={website} onChange={(e) => setWebsite(e.target.value)} />
          </div>

          <Section title="What it is">
            {chosen.subtypes && chosen.subtypes.length > 0 && (
              <div role="radiogroup" aria-label="Which kind" aria-describedby={err("subtype") ? `${uid}-subtype-error` : undefined}>
                <div className="flex flex-wrap gap-2">
                  {chosen.subtypes.map((s) => (
                    <button key={s.value} type="button" role="radio" aria-checked={subtype === s.value} onClick={() => setSubtype(s.value)} className={CHIP(subtype === s.value)}>
                      {s.label}
                    </button>
                  ))}
                </div>
                {err("subtype") && (
                  <p id={`${uid}-subtype-error`} role="alert" className="text-critical mt-1.5 text-sm">
                    {err("subtype")}
                  </p>
                )}
              </div>
            )}
            {subtype === "other" && (
              <Field id={`${uid}-subtypeOther`} label="Describe it" error={err("subtypeOther")}>
                <input id={`${uid}-subtypeOther`} value={subtypeOther} onChange={(e) => setSubtypeOther(e.target.value)} maxLength={200} className={FIELD} {...aria("subtypeOther")} />
              </Field>
            )}

            {form === "recruitment" && (
              <>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field id={`${uid}-jobTitle`} label="Role title" error={err("details.jobTitle")}>
                    <input id={`${uid}-jobTitle`} value={val("jobTitle")} onChange={set("jobTitle")} maxLength={160} className={FIELD} {...aria("details.jobTitle")} />
                  </Field>
                  <Field id={`${uid}-seniority`} label="Seniority" optional>
                    <input id={`${uid}-seniority`} value={val("seniority")} onChange={set("seniority")} maxLength={80} placeholder="Graduate, junior, mid…" className={FIELD} />
                  </Field>
                  <Field id={`${uid}-representation`} label="Hiring for" error={err("details.representation")}>
                    <select id={`${uid}-representation`} value={val("representation")} onChange={set("representation")} className={FIELD} {...aria("details.representation")}>
                      <option value="">Choose</option>
                      <option value="own">My own organisation</option>
                      <option value="client">A client</option>
                      <option value="agency">As a recruitment agency</option>
                      <option value="other">Other</option>
                    </select>
                  </Field>
                  {(val("representation") === "client" || val("representation") === "other" || val("representation") === "agency") && (
                    <Field id={`${uid}-representationNote`} label="On behalf of" error={err("details.representationNote")} optional={val("representation") === "agency"}>
                      <input id={`${uid}-representationNote`} value={val("representationNote")} onChange={set("representationNote")} maxLength={200} className={FIELD} {...aria("details.representationNote")} />
                    </Field>
                  )}
                  <Field id={`${uid}-workArrangement`} label="Arrangement" error={err("details.workArrangement")}>
                    <select id={`${uid}-workArrangement`} value={val("workArrangement")} onChange={set("workArrangement")} className={FIELD} {...aria("details.workArrangement")}>
                      <option value="">Choose</option>
                      <option value="remote">Remote</option>
                      <option value="hybrid">Hybrid</option>
                      <option value="on-site">On-site</option>
                      <option value="flexible">Flexible</option>
                      <option value="other">Other</option>
                    </select>
                  </Field>
                  {val("workArrangement") === "other" && (
                    <Field id={`${uid}-workArrangementNote`} label="Describe the arrangement" error={err("details.workArrangementNote")}>
                      <input id={`${uid}-workArrangementNote`} value={val("workArrangementNote")} onChange={set("workArrangementNote")} maxLength={200} className={FIELD} {...aria("details.workArrangementNote")} />
                    </Field>
                  )}
                  <Field id={`${uid}-location`} label="Location" optional>
                    <input id={`${uid}-location`} value={val("location")} onChange={set("location")} maxLength={160} placeholder="City, country" className={FIELD} />
                  </Field>
                  <Field id={`${uid}-startDate`} label="Start date" optional>
                    <input id={`${uid}-startDate`} type="date" value={val("startDate")} onChange={set("startDate")} className={FIELD} />
                  </Field>
                  <Field id={`${uid}-applicationDeadline`} label="Apply by" optional>
                    <input id={`${uid}-applicationDeadline`} type="date" value={val("applicationDeadline")} onChange={set("applicationDeadline")} className={FIELD} />
                  </Field>
                </div>
              </>
            )}

            {(form === "service" || form === "collaboration") && (
              <Field id={`${uid}-projectName`} label="Project name" optional={form === "service"} error={err("details.projectName")}>
                <input id={`${uid}-projectName`} value={val("projectName")} onChange={set("projectName")} maxLength={160} className={FIELD} {...aria("details.projectName")} />
              </Field>
            )}
            {form === "service" && (
              <>
                <Field id={`${uid}-desiredOutcome`} label="What should it achieve?" error={err("details.desiredOutcome")}>
                  <textarea id={`${uid}-desiredOutcome`} rows={3} value={val("desiredOutcome")} onChange={set("desiredOutcome")} maxLength={1000} className={cn(FIELD, "resize-y")} {...aria("details.desiredOutcome")} />
                </Field>
                <Field id={`${uid}-existingSystem`} label="Anything that already exists" optional hint="A site, an app, a spreadsheet — a link or a line.">
                  <input id={`${uid}-existingSystem`} value={val("existingSystem")} onChange={set("existingSystem")} maxLength={300} className={FIELD} />
                </Field>
              </>
            )}
            {form === "collaboration" && (
              <div className="grid gap-5 sm:grid-cols-2">
                <Field id={`${uid}-stage`} label="Where it stands" error={err("details.stage")}>
                  <select id={`${uid}-stage`} value={val("stage")} onChange={set("stage")} className={FIELD} {...aria("details.stage")}>
                    <option value="">Choose</option>
                    <option value="idea">An idea</option>
                    <option value="prototype">A prototype</option>
                    <option value="building">Being built</option>
                    <option value="live">Live</option>
                    <option value="other">Other</option>
                  </select>
                </Field>
                <Field id={`${uid}-commitment`} label="Time it needs" error={err("details.commitment")}>
                  <select id={`${uid}-commitment`} value={val("commitment")} onChange={set("commitment")} className={FIELD} {...aria("details.commitment")}>
                    <option value="">Choose</option>
                    <option value="a-few-hours">A few hours</option>
                    <option value="part-time">Part-time</option>
                    <option value="full-time">Full-time</option>
                    <option value="unsure">Not sure yet</option>
                  </select>
                </Field>
                <div className="sm:col-span-2">
                  <Field id={`${uid}-expectedContribution`} label="What you'd want from Kurhula" error={err("details.expectedContribution")}>
                    <textarea id={`${uid}-expectedContribution`} rows={3} value={val("expectedContribution")} onChange={set("expectedContribution")} maxLength={1000} className={cn(FIELD, "resize-y")} {...aria("details.expectedContribution")} />
                  </Field>
                </div>
              </div>
            )}
            {form === "growth" && (
              <>
                <Field id={`${uid}-objective`} label="What you want to achieve" error={err("details.objective")}>
                  <textarea id={`${uid}-objective`} rows={3} value={val("objective")} onChange={set("objective")} maxLength={1000} className={cn(FIELD, "resize-y")} {...aria("details.objective")} />
                </Field>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field id={`${uid}-targetAudience`} label="Who it's for" optional>
                    <input id={`${uid}-targetAudience`} value={val("targetAudience")} onChange={set("targetAudience")} maxLength={300} className={FIELD} />
                  </Field>
                  <Field id={`${uid}-currentPresence`} label="Where you are now" optional error={err("details.currentPresence")} hint="A website or social link">
                    <input id={`${uid}-currentPresence`} value={val("currentPresence")} onChange={set("currentPresence")} placeholder="https://" className={FIELD} {...aria("details.currentPresence")} />
                  </Field>
                </div>
              </>
            )}
            {(form === "service" || form === "growth") && (
              <Field id={`${uid}-timeline`} label="Timeline" error={err("details.timeline")}>
                <select id={`${uid}-timeline`} value={val("timeline")} onChange={set("timeline")} className={FIELD} {...aria("details.timeline")}>
                  <option value="">Choose</option>
                  <option value="asap">As soon as possible</option>
                  <option value="1-3-months">1–3 months</option>
                  <option value="3-6-months">3–6 months</option>
                  <option value="6-plus-months">6 months or more</option>
                  <option value="flexible">Flexible</option>
                </select>
              </Field>
            )}

            <Field id={`${uid}-message`} label={msg.label} error={err("message")} hint={`${msg.hint} ${message.trim().length} / 5000.`}>
              <textarea id={`${uid}-message`} rows={6} value={message} onChange={(e) => setMessage(e.target.value)} maxLength={5000} className={cn(FIELD, "min-h-40 resize-y")} {...aria("message")} />
            </Field>
          </Section>

          {hasComp && (
            <Section title={form === "recruitment" ? "Compensation" : form === "collaboration" ? "Compensation, if any" : "Budget"}>
              <div role="radiogroup" aria-label="How it's paid" aria-describedby={err("details.compensation.mode") ? `${uid}-comp-error` : undefined}>
                <div className="flex flex-wrap gap-2">
                  {[
                    ["range", "Give a range"],
                    ["discuss", "Prefer to discuss"],
                    ["unpaid", "Unpaid"],
                    ...(form === "collaboration" ? [["not-applicable", "Not applicable"]] : []),
                  ].map(([k, label]) => (
                    <button key={k} type="button" role="radio" aria-checked={comp.mode === k} onClick={() => setComp((c) => ({ ...c, mode: k! }))} className={CHIP(comp.mode === k)}>
                      {label}
                    </button>
                  ))}
                </div>
                {err("details.compensation.mode") && (
                  <p id={`${uid}-comp-error`} role="alert" className="text-critical mt-1.5 text-sm">
                    {err("details.compensation.mode")}
                  </p>
                )}
              </div>
              {comp.mode === "range" && (
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field id={`${uid}-structure`} label="Paid as" error={err("details.compensation.structure")}>
                    <select id={`${uid}-structure`} value={comp.structure} onChange={(e) => setComp((c) => ({ ...c, structure: e.target.value }))} className={FIELD}>
                      {COMPENSATION_STRUCTURES.map((s) => (
                        <option key={s} value={s}>
                          {{ annual: "Annual salary", monthly: "Monthly salary", hourly: "Hourly rate", daily: "Daily rate", project: "Project fee", commission: "Commission", equity: "Equity", "revenue-share": "Revenue share", other: "Other" }[s]}
                        </option>
                      ))}
                    </select>
                  </Field>
                  {["annual", "monthly", "hourly", "daily", "project"].includes(comp.structure) && (
                    <Field id={`${uid}-currency`} label="Currency" error={err("details.compensation.currency")}>
                      <select id={`${uid}-currency`} value={comp.currency} onChange={(e) => setComp((c) => ({ ...c, currency: e.target.value }))} className={FIELD}>
                        {CURRENCIES.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </Field>
                  )}
                  <Field id={`${uid}-min`} label="From" error={err("details.compensation.min")}>
                    <input id={`${uid}-min`} type="number" inputMode="decimal" min={0} value={comp.min} onChange={(e) => setComp((c) => ({ ...c, min: e.target.value }))} className={FIELD} {...aria("details.compensation.min")} />
                  </Field>
                  <Field id={`${uid}-max`} label="Up to" optional error={err("details.compensation.max")}>
                    <input id={`${uid}-max`} type="number" inputMode="decimal" min={0} value={comp.max} onChange={(e) => setComp((c) => ({ ...c, max: e.target.value }))} className={FIELD} {...aria("details.compensation.max")} />
                  </Field>
                  <label className="text-ink flex items-center gap-2 text-sm sm:col-span-2">
                    <input type="checkbox" checked={comp.negotiable} onChange={(e) => setComp((c) => ({ ...c, negotiable: e.target.checked }))} className="accent-ember size-4" />
                    Negotiable
                  </label>
                </div>
              )}
              {comp.mode && (
                <Field id={`${uid}-compNote`} label="Anything to add" optional>
                  <input id={`${uid}-compNote`} value={comp.note} onChange={(e) => setComp((c) => ({ ...c, note: e.target.value }))} maxLength={300} placeholder="Benefits, equity terms, how it's structured…" className={FIELD} />
                </Field>
              )}
            </Section>
          )}

          {hasMeeting && (
            <Section title={form === "recruitment" ? "Is an interview already arranged?" : "Is a meeting already arranged?"}>
              <div role="radiogroup" aria-label="Meeting" className="flex flex-wrap gap-2">
                {[
                  ["none", "No"],
                  ["scheduled", "Yes"],
                  ["tbd", "To be arranged"],
                ].map(([k, label]) => (
                  <button key={k} type="button" role="radio" aria-checked={meeting.status === k} onClick={() => setMeeting((m) => ({ ...m, status: k!, timeZone: m.timeZone || browserZone }))} className={CHIP(meeting.status === k)}>
                    {label}
                  </button>
                ))}
              </div>
              {meeting.status === "scheduled" && (
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field id={`${uid}-mkind`} label="Kind">
                    <select id={`${uid}-mkind`} value={meeting.kind} onChange={(e) => setMeeting((m) => ({ ...m, kind: e.target.value }))} className={FIELD}>
                      {MEETING_KINDS.map((k) => (
                        <option key={k} value={k}>
                          {{ hr: "HR interview", technical: "Technical interview", manager: "Manager interview", panel: "Panel interview", discovery: "Discovery call", client: "Client meeting", general: "General meeting", other: "Other" }[k]}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field id={`${uid}-mwhen`} label="Date and time" error={err("details.meeting.startsAtLocal")}>
                    <input id={`${uid}-mwhen`} type="datetime-local" value={meeting.startsAtLocal} onChange={(e) => setMeeting((m) => ({ ...m, startsAtLocal: e.target.value }))} className={FIELD} {...aria("details.meeting.startsAtLocal")} />
                  </Field>
                  <Field id={`${uid}-mtz`} label="Time zone" error={err("details.meeting.timeZone")} hint="The zone the time above is in — yours is filled in.">
                    <input id={`${uid}-mtz`} value={meeting.timeZone} onChange={(e) => setMeeting((m) => ({ ...m, timeZone: e.target.value }))} placeholder="Africa/Johannesburg" className={FIELD} {...aria("details.meeting.timeZone")} />
                  </Field>
                  <Field id={`${uid}-mdur`} label="Length in minutes" optional>
                    <input id={`${uid}-mdur`} type="number" min={5} max={480} value={meeting.durationMinutes} onChange={(e) => setMeeting((m) => ({ ...m, durationMinutes: e.target.value }))} className={FIELD} />
                  </Field>
                  <Field id={`${uid}-mloc`} label="Platform or place" optional>
                    <input id={`${uid}-mloc`} value={meeting.location} onChange={(e) => setMeeting((m) => ({ ...m, location: e.target.value }))} maxLength={200} placeholder="Teams, Zoom, an address…" className={FIELD} />
                  </Field>
                  <Field id={`${uid}-mlink`} label="Meeting link" optional error={err("details.meeting.link")}>
                    <input id={`${uid}-mlink`} value={meeting.link} onChange={(e) => setMeeting((m) => ({ ...m, link: e.target.value }))} placeholder="https://" className={FIELD} {...aria("details.meeting.link")} />
                  </Field>
                  <Field id={`${uid}-mwho`} label="Contact person" optional>
                    <input id={`${uid}-mwho`} value={meeting.contactPerson} onChange={(e) => setMeeting((m) => ({ ...m, contactPerson: e.target.value }))} maxLength={120} className={FIELD} />
                  </Field>
                </div>
              )}
            </Section>
          )}

          <Section title="You">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field id={`${uid}-name`} label="Name" error={err("name")}>
                <input id={`${uid}-name`} autoComplete="name" value={contact.name} onChange={(e) => setContact((c) => ({ ...c, name: e.target.value }))} maxLength={200} className={FIELD} {...aria("name")} />
              </Field>
              <Field id={`${uid}-email`} label="Email" error={err("email")}>
                <input id={`${uid}-email`} type="email" inputMode="email" autoComplete="email" value={contact.email} onChange={(e) => setContact((c) => ({ ...c, email: e.target.value }))} maxLength={254} className={FIELD} {...aria("email")} />
              </Field>
              {form !== "general" && (
                <>
                  <Field id={`${uid}-org`} label="Organisation" optional>
                    <input id={`${uid}-org`} autoComplete="organization" value={contact.organization} onChange={(e) => setContact((c) => ({ ...c, organization: e.target.value }))} maxLength={160} className={FIELD} />
                  </Field>
                  <Field id={`${uid}-role`} label="Your role" optional>
                    <input id={`${uid}-role`} autoComplete="organization-title" value={contact.role} onChange={(e) => setContact((c) => ({ ...c, role: e.target.value }))} maxLength={120} className={FIELD} />
                  </Field>
                  <Field id={`${uid}-site`} label="Website" optional error={err("organizationWebsite")}>
                    <input id={`${uid}-site`} type="url" autoComplete="url" value={contact.organizationWebsite} onChange={(e) => setContact((c) => ({ ...c, organizationWebsite: e.target.value }))} placeholder="https://" className={FIELD} {...aria("organizationWebsite")} />
                  </Field>
                  <Field id={`${uid}-profile`} label="LinkedIn or profile" optional error={err("profileUrl")}>
                    <input id={`${uid}-profile`} type="url" value={contact.profileUrl} onChange={(e) => setContact((c) => ({ ...c, profileUrl: e.target.value }))} placeholder="https://" className={FIELD} {...aria("profileUrl")} />
                  </Field>
                </>
              )}
            </div>
            <div>
              <p className="text-ink mb-2 text-sm font-medium" id={`${uid}-channel-label`}>
                Best way to reach you
              </p>
              <div role="radiogroup" aria-labelledby={`${uid}-channel-label`} className="flex flex-wrap gap-2">
                {CHANNELS.map((ch) => (
                  <button key={ch} type="button" role="radio" aria-checked={contact.preferredChannel === ch} onClick={() => setContact((c) => ({ ...c, preferredChannel: ch }))} className={CHIP(contact.preferredChannel === ch)}>
                    {CHANNEL_LABEL[ch]}
                  </button>
                ))}
              </div>
            </div>
            {(contact.preferredChannel === "phone" || contact.preferredChannel === "whatsapp" || contact.preferredChannel === "sms" || contact.phone) && (
              <Field id={`${uid}-phone`} label={contact.preferredChannel === "whatsapp" ? "WhatsApp number" : "Phone number"} error={err("phone")}>
                <input id={`${uid}-phone`} type="tel" autoComplete="tel" value={contact.phone} onChange={(e) => setContact((c) => ({ ...c, phone: e.target.value }))} placeholder="+27 82 123 4567" className={FIELD} {...aria("phone")} />
              </Field>
            )}
            {contact.preferredChannel === "other" && (
              <Field id={`${uid}-chOther`} label="How should he reach you?" error={err("preferredChannelOther")}>
                <input id={`${uid}-chOther`} value={contact.preferredChannelOther} onChange={(e) => setContact((c) => ({ ...c, preferredChannelOther: e.target.value }))} maxLength={120} className={FIELD} {...aria("preferredChannelOther")} />
              </Field>
            )}
          </Section>

          {documents.maxFiles > 0 && (
            <Section title="Documents">
              <div>
                <label htmlFor={`${uid}-docs`} className="border-ink/20 hover:border-ember/60 focus-within:border-ember flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed px-5 py-4 transition-colors">
                  <Paperclip aria-hidden="true" className="text-slate size-5" />
                  <span className="text-sm">
                    <span className="text-ink font-medium">Attach PDFs</span>
                    <span className="text-slate"> — {form === "recruitment" ? "a job description" : form === "general" ? "anything useful" : "a brief or proposal"}. Up to {documents.maxFiles}, {documents.maxMegabytes} MB in total. Optional.</span>
                  </span>
                  <input
                    id={`${uid}-docs`}
                    type="file"
                    accept="application/pdf,.pdf"
                    multiple
                    className="sr-only"
                    onChange={(e) => {
                      const picked = Array.from(e.target.files ?? []);
                      const pdfs = picked.filter((f) => f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf"));
                      setErrors((x) => ({ ...x, documents: pdfs.length < picked.length ? "Only PDF files can be attached" : "" }));
                      setFiles((cur) => [...cur, ...pdfs].slice(0, documents.maxFiles));
                      e.target.value = "";
                    }}
                  />
                </label>
                {err("documents") && (
                  <p role="alert" className="text-critical mt-1.5 text-sm">
                    {err("documents")}
                  </p>
                )}
                {files.length > 0 && (
                  <ul className="mt-3 space-y-2">
                    {files.map((f, i) => (
                      <li key={`${f.name}-${i}`} className="border-ink/10 bg-paper flex items-center gap-3 rounded-xl border px-3 py-2 text-sm">
                        <FileText aria-hidden="true" className="text-accent size-4 shrink-0" />
                        <span className="text-ink min-w-0 flex-1 truncate">{f.name}</span>
                        <span className="text-slate text-xs">{Math.ceil(f.size / 1024)} KB</span>
                        <button type="button" onClick={() => setFiles((cur) => cur.filter((_, j) => j !== i))} className="text-slate hover:text-ink rounded-full p-1" aria-label={`Remove ${f.name}`}>
                          <X aria-hidden="true" className="size-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </Section>
          )}

          <div className="border-ink/10 space-y-4 border-t pt-7">
            <p className="text-slate text-xs leading-relaxed">
              Your details are used only to reply to this message. They&rsquo;re kept for {retentionMonths} months, then anonymised automatically; to have them removed sooner, email{" "}
              <a className="text-accent underline underline-offset-4" href={`mailto:${email}`}>
                {email}
              </a>
              . No account is created.
            </p>
            <div aria-live="polite">{state.kind === "problem" && <p className="text-critical text-sm">{state.message}</p>}</div>
            <Button type="submit" variant="accent" size="lg" disabled={state.kind === "sending"} className="w-full sm:w-auto">
              {state.kind === "sending" ? (
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
    </div>
  );
}
