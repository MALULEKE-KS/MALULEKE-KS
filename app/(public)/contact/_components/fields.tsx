// app/(public)/contact/_components/fields.tsx
// Let's Talk — the form's building blocks: a labelled field with its hint and
// error, a section, a row of choice chips (a real radiogroup: arrow keys move
// and choose, one tab stop), and the spec-driven input that draws any field
// in lib/inquiries/fields.ts.

"use client";

import { useRef } from "react";
import { cn } from "@/lib/utils";
import type { FieldSpec } from "@/lib/inquiries/fields";

export const FIELD =
  "w-full rounded-xl border border-ink/15 bg-paper px-4 py-3 font-sans text-base text-ink shadow-inset-hair outline-none transition-[border-color,box-shadow] placeholder:text-slate/70 focus:border-ember focus:ring-4 focus:ring-ember/15 aria-[invalid=true]:border-critical";

export function ErrorText({ id, children }: { id?: string; children?: string }) {
  if (!children) return null;
  return (
    <p id={id} role="alert" className="text-critical mt-1.5 text-sm">
      {children}
    </p>
  );
}

export function Field({ id, label, error, hint, optional, className, children }: { id: string; label: string; error?: string; hint?: string; optional?: boolean; className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("min-w-0", className)}>
      <label htmlFor={id} className="text-ink mb-2 block text-sm font-medium">
        {label}
        {optional && <span className="text-slate font-normal"> (optional)</span>}
      </label>
      {children}
      {hint && !error && <p className="text-slate mt-1.5 text-xs">{hint}</p>}
      <ErrorText id={`${id}-error`}>{error}</ErrorText>
    </div>
  );
}

/** A numbered part of the form; `id` is what the progress rail links to. */
export function Section({ id, step, title, done, children }: { id: string; step: number; title: string; done?: boolean; children: React.ReactNode }) {
  return (
    <fieldset id={id} className="border-ink/10 min-w-0 scroll-mt-28 border-t pt-8 first:border-t-0 first:pt-0">
      <legend className="float-left mb-6 flex w-full items-center gap-3">
        <span className={cn("grid size-7 shrink-0 place-items-center rounded-full font-mono text-xs font-semibold transition-colors", done ? "bg-signal-finished text-paper" : "bg-ink text-paper")}>{step}</span>
        <span className="text-ink font-sans text-lg font-semibold tracking-tight">{title}</span>
      </legend>
      <div className="clear-both space-y-5">{children}</div>
    </fieldset>
  );
}

/** One choice from a few — a radiogroup with roving focus. */
export function Choices<T extends string>({ label, labelledBy, value, options, onChange, errorId }: { label?: string; labelledBy?: string; value: T | ""; options: { value: T; label: string }[]; onChange: (v: T) => void; errorId?: string }) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const current = Math.max(0, options.findIndex((o) => o.value === value));
  const move = (to: number) => {
    const i = (to + options.length) % options.length;
    onChange(options[i]!.value);
    refs.current[i]?.focus();
  };
  return (
    <div role="radiogroup" aria-label={label} aria-labelledby={labelledBy} aria-describedby={errorId} className="flex flex-wrap gap-2">
      {options.map((o, i) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={on}
            tabIndex={i === current ? 0 : -1}
            onClick={() => onChange(o.value)}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight" || e.key === "ArrowDown") (e.preventDefault(), move(i + 1));
              if (e.key === "ArrowLeft" || e.key === "ArrowUp") (e.preventDefault(), move(i - 1));
            }}
            className={cn(
              "rounded-full border px-3.5 py-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember",
              on ? "border-ink bg-ink text-paper" : "border-ink/15 bg-paper text-slate hover:border-ink/35 hover:text-ink",
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Any field from a category's spec. */
export function SpecInput({ spec, id, value, onChange, error, label }: { spec: FieldSpec; id: string; value: string; onChange: (v: string) => void; error?: string; label: string }) {
  const aria = { "aria-invalid": Boolean(error), "aria-describedby": error ? `${id}-error` : undefined };
  const change = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => onChange(e.target.value);
  return (
    <Field id={id} label={label} error={error} hint={spec.hint} optional={spec.optional} className={spec.wide ? "sm:col-span-2" : undefined}>
      {spec.kind === "textarea" ? (
        <textarea id={id} rows={3} value={value} onChange={change} maxLength={spec.max} className={cn(FIELD, "resize-y")} {...aria} />
      ) : spec.kind === "select" ? (
        <select id={id} value={value} onChange={change} className={FIELD} {...aria}>
          <option value="">Choose</option>
          {spec.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      ) : (
        <input id={id} type={spec.kind === "date" ? "date" : spec.kind === "url" ? "url" : "text"} value={value} onChange={change} maxLength={spec.max} placeholder={spec.placeholder} className={FIELD} {...aria} />
      )}
    </Field>
  );
}
