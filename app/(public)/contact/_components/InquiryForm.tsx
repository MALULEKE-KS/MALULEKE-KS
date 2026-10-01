// app/(public)/contact/_components/InquiryForm.tsx
// Colocated — only used on /contact. A real <select> of the inquiry types
// (the InquiryType lookup, passed in — EXT-1, #99), validated client-side
// against InquiryCreateInputSchema before submit, a hidden honeypot field,
// and an idempotencyKey generated once per form (BR-2.6: a double-submit is
// one inquiry). Inline confirmation on success — no redirect — stating the
// admin-set review window (BR-2.2) and the removal route (BR-5.5).
// See docs/PAGE-SPECIFICATIONS.md ("/contact").

"use client";

import { useEffect, useId, useRef, useState } from "react";
import { INQUIRY_DRAFT_KEY } from "@/lib/guide/keys";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InquiryCreateInputSchema } from "@/lib/schemas";
import type { InquiryTypeOption } from "@/lib/queries/site";
import { cn } from "@/lib/utils";

type SubmitState = "idle" | "submitting" | "success" | "rate-limited" | "error";

interface InquiryFormProps {
  inquiryTypes: InquiryTypeOption[];
  email: string;
  reviewSlaHours: number;
}

const FIELD =
  "w-full rounded-xl border border-ink/15 bg-paper px-4 py-3 font-sans text-base text-ink shadow-inset-hair outline-none transition-[border-color,box-shadow] placeholder:text-slate/70 focus:border-ember focus:ring-4 focus:ring-ember/15 aria-[invalid=true]:border-critical";

function Field({
  id,
  label,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="text-ink mb-2 block text-sm font-medium">
        {label}
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

export function InquiryForm({ inquiryTypes, email, reviewSlaHours }: InquiryFormProps) {
  const uid = useId();
  const [name, setName] = useState("");
  const [senderEmail, setSenderEmail] = useState("");
  const [message, setMessage] = useState("");
  const [inquiryType, setInquiryType] = useState("");
  const [website, setWebsite] = useState(""); // honeypot — real visitors never see this field
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<SubmitState>("idle");
  const [fromGuide, setFromGuide] = useState(false);

  // A draft the AI guide wrote for the visitor (BR-4.1/4.2): it only fills the
  // message — the visitor reviews it, adds their details and sends it through
  // this same form, validation and rate limit. Read once, then forgotten.
  useEffect(() => {
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
  // One key per form, kept across retries, so a resubmission is deduplicated (BR-2.6).
  const idempotencyKey = useRef<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});
    idempotencyKey.current ??= crypto.randomUUID();

    const parsed = InquiryCreateInputSchema.safeParse({
      name,
      email: senderEmail,
      message,
      inquiryType,
      idempotencyKey: idempotencyKey.current,
    });
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string" && !errors[field]) errors[field] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }

    setState("submitting");
    try {
      const res = await fetch("/api/v1/inquiries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...parsed.data, website }),
      });
      if (res.status === 429) return setState("rate-limited");
      if (!res.ok) return setState("error");
      setState("success");
    } catch {
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div
        role="status"
        className="border-signal-finished/25 bg-signal-finished/[0.06] rounded-2xl border p-6 md:p-8"
      >
        <CheckCircle2 aria-hidden="true" className="text-signal-finished size-8" />
        {/* BR-2.2: a review within the admin-set window — not a promised reply. */}
        <p className="text-ink mt-4 font-sans text-xl font-semibold">
          Received. I review every inquiry within {reviewSlaHours} hours.
        </p>
        {/* BR-5.5: the removal route. */}
        <p className="text-slate mt-3 text-sm leading-relaxed">
          To request removal of this submission, email{" "}
          <a
            className="text-accent font-medium underline underline-offset-4"
            href={`mailto:${email}`}
          >
            {email}
          </a>
          .
        </p>
      </div>
    );
  }

  const err = (field: string) => fieldErrors[field];
  const described = (field: string) => (err(field) ? `${uid}-${field}-error` : undefined);

  return (
    <form id="inquiry-form" onSubmit={handleSubmit} noValidate className="space-y-6 scroll-mt-28">
      {fromGuide && (
        <p role="status" className="rounded-xl border border-ember/30 bg-ember/10 px-4 py-3 text-sm">
          The AI guide drafted your message below. Read it, change anything you like, add your details — nothing is sent until you press send.
        </p>
      )}
      {/* Honeypot — off-screen, not display:none (some bots skip that),
          never focusable or announced to real visitors (BR-2.7). */}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label htmlFor={`${uid}-website`}>Website</label>
        <input
          id={`${uid}-website`}
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <Field id={`${uid}-inquiryType`} label="What’s this about?" error={err("inquiryType")}>
        <select
          id={`${uid}-inquiryType`}
          value={inquiryType}
          onChange={(e) => setInquiryType(e.target.value)}
          aria-invalid={Boolean(err("inquiryType"))}
          aria-describedby={described("inquiryType")}
          className={cn(
            FIELD,
            "appearance-none bg-[length:1rem] bg-[right_1rem_center] bg-no-repeat pr-10"
          )}
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%234B5159' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
          }}
        >
          <option value="">Choose one</option>
          {inquiryTypes.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
      </Field>

      <div className="grid gap-6 sm:grid-cols-2">
        <Field id={`${uid}-name`} label="Name" error={err("name")}>
          <input
            id={`${uid}-name`}
            type="text"
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-invalid={Boolean(err("name"))}
            aria-describedby={described("name")}
            className={FIELD}
          />
        </Field>
        <Field id={`${uid}-email`} label="Email" error={err("email")}>
          <input
            id={`${uid}-email`}
            type="email"
            autoComplete="email"
            inputMode="email"
            value={senderEmail}
            onChange={(e) => setSenderEmail(e.target.value)}
            aria-invalid={Boolean(err("email"))}
            aria-describedby={described("email")}
            className={FIELD}
          />
        </Field>
      </div>

      <Field
        id={`${uid}-message`}
        label="Message"
        error={err("message")}
        hint={`${message.trim().length} / 5000 — at least 20 characters`}
      >
        <textarea
          id={`${uid}-message`}
          rows={6}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          aria-invalid={Boolean(err("message"))}
          aria-describedby={described("message")}
          className={cn(FIELD, "min-h-40 resize-y")}
        />
      </Field>

      <div aria-live="polite">
        {state === "rate-limited" && (
          <p className="text-critical text-sm">
            Too many requests from this connection — try again tomorrow.
          </p>
        )}
        {state === "error" && (
          <p className="text-critical text-sm">Something went wrong. Try again.</p>
        )}
      </div>

      <Button
        type="submit"
        variant="accent"
        size="lg"
        disabled={state === "submitting"}
        className="w-full sm:w-auto"
      >
        {state === "submitting" ? (
          <>
            <Loader2 className="animate-spin" />
            Sending…
          </>
        ) : (
          <>
            Send inquiry
            <ArrowRight />
          </>
        )}
      </Button>
    </form>
  );
}
