// app/(public)/contact/_components/InquiryForm.tsx
// Colocated — only used on /contact. Real <select> for the six InquiryType
// values, client-side validated against InquiryCreateInputSchema before
// submit, hidden honeypot field, idempotencyKey generated client-side
// (BR-2.6). Inline confirmation on success — no redirect — stating the
// real BR-2.2 SLA. See docs/PAGE-SPECIFICATIONS.md ("/contact").

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { INQUIRY_TYPES } from "@/lib/content/inquiry";
import { OWNER } from "@/lib/content/sheets";
import { InquiryCreateInputSchema } from "@/lib/schemas";


type SubmitState = "idle" | "submitting" | "success" | "rate-limited" | "error";

export function InquiryForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [inquiryType, setInquiryType] = useState("");
  const [website, setWebsite] = useState(""); // honeypot — real visitors never see this field
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [state, setState] = useState<SubmitState>("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFieldErrors({});

    const idempotencyKey = crypto.randomUUID();
    const parsed = InquiryCreateInputSchema.safeParse({
      name,
      email,
      message,
      inquiryType,
      idempotencyKey,
    });

    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const field = issue.path[0];
        if (typeof field === "string") errors[field] = issue.message;
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

      if (res.status === 429) {
        setState("rate-limited");
        return;
      }
      if (!res.ok) {
        setState("error");
        return;
      }

      setState("success");
    } catch {
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <div className="border-t border-slate/20 pt-6">
        {/* BR-2.2: every inquiry is reviewed within 48 hours — a review, not
            a promised reply. BR-5.5: the removal route is stated here. */}
        <p className="font-sans text-ink">Received. I review every inquiry within 48 hours.</p>
        <p className="mt-2 font-sans text-sm text-slate">
          To request removal of this submission, email{" "}
          <a className="underline underline-offset-4" href={`mailto:${OWNER.email}`}>
            {OWNER.email}
          </a>
          .
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
      {/* Honeypot — off-screen, not display:none (some bots skip that),
          never focusable or announced to real visitors (BR-2.7). */}
      <div className="absolute -left-[9999px]" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input
          id="website"
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor="inquiryType" className="font-sans text-sm text-ink block mb-1">
          What&rsquo;s this about?
        </label>
        <select
          id="inquiryType"
          value={inquiryType}
          onChange={(e) => setInquiryType(e.target.value)}
          className="w-full border-b border-slate/30 bg-transparent px-0 py-2 font-sans text-sm text-ink outline-none focus:border-accent"
        >
          <option value="">Choose one</option>
          {INQUIRY_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>
        {fieldErrors.inquiryType && (
          <p className="font-mono text-xs text-critical mt-1">{fieldErrors.inquiryType}</p>
        )}
      </div>

      <div>
        <label htmlFor="name" className="font-sans text-sm text-ink block mb-1">
          Name
        </label>
        <input
          id="name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border-b border-slate/30 bg-transparent px-0 py-2 font-sans text-sm text-ink outline-none focus:border-accent"
        />
        {fieldErrors.name && <p className="font-mono text-xs text-critical mt-1">{fieldErrors.name}</p>}
      </div>

      <div>
        <label htmlFor="email" className="font-sans text-sm text-ink block mb-1">
          Email
        </label>
        <input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border-b border-slate/30 bg-transparent px-0 py-2 font-sans text-sm text-ink outline-none focus:border-accent"
        />
        {fieldErrors.email && <p className="font-mono text-xs text-critical mt-1">{fieldErrors.email}</p>}
      </div>

      <div>
        <label htmlFor="message" className="font-sans text-sm text-ink block mb-1">
          Message
        </label>
        <textarea
          id="message"
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full border border-slate/30 bg-transparent px-3 py-2 font-sans text-sm text-ink outline-none focus:border-accent"
        />
        {fieldErrors.message && (
          <p className="font-mono text-xs text-critical mt-1">{fieldErrors.message}</p>
        )}
      </div>

      {state === "rate-limited" && (
        <p className="font-sans text-sm text-critical">
          Too many requests from this connection — try again tomorrow.
        </p>
      )}
      {state === "error" && (
        <p className="font-sans text-sm text-critical">Something went wrong. Try again.</p>
      )}

      <Button type="submit" disabled={state === "submitting"}>
        {state === "submitting" ? "Sending…" : "Send"}
      </Button>
    </form>
  );
}
