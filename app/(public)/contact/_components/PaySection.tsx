// app/(public)/contact/_components/PaySection.tsx
// Let's Talk — compensation or budget (LT-4): a choice — a range, "prefer to
// discuss", unpaid, or (for a collaboration) not applicable — never guessed
// from a blank. A range in money carries its currency.

"use client";

import { COMPENSATION_STRUCTURES } from "@/lib/inquiries/forms";
import { COMPENSATION_MODE_LABEL, CURRENCIES, FORM_SHAPE, MONEY_STRUCTURES, STRUCTURE_LABEL, type CompensationMode } from "@/lib/inquiries/fields";
import { Choices, ErrorText, FIELD, Field, Section } from "./fields";
import type { InquiryForm } from "./use-inquiry-form";

export function PaySection({ f, uid, step }: { f: InquiryForm; uid: string; step: number }) {
  const shape = FORM_SHAPE[f.form].compensation;
  if (!shape) return null;
  const c = f.compensation;
  const err = (k: string) => f.errors[`details.compensation.${k}`];
  return (
    <Section id="part-pay" step={step} title={shape.title} done={c.mode !== ""}>
      <div>
        <Choices<CompensationMode>
          label="How it's paid"
          value={c.mode}
          options={shape.modes.map((m) => ({ value: m, label: COMPENSATION_MODE_LABEL[m] }))}
          onChange={(mode) => f.setCompensation({ mode })}
          errorId={err("mode") ? `${uid}-comp-error` : undefined}
        />
        <ErrorText id={`${uid}-comp-error`}>{err("mode")}</ErrorText>
      </div>
      {c.mode === "range" && (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id={`${uid}-structure`} label="Paid as" error={err("structure")}>
            <select id={`${uid}-structure`} value={c.structure} onChange={(e) => f.setCompensation({ structure: e.target.value })} className={FIELD}>
              {COMPENSATION_STRUCTURES.map((s) => (
                <option key={s} value={s}>
                  {STRUCTURE_LABEL[s]}
                </option>
              ))}
            </select>
          </Field>
          {MONEY_STRUCTURES.includes(c.structure) && (
            <Field id={`${uid}-currency`} label="Currency" error={err("currency")}>
              <select id={`${uid}-currency`} value={c.currency} onChange={(e) => f.setCompensation({ currency: e.target.value })} className={FIELD}>
                {CURRENCIES.map((cur) => (
                  <option key={cur} value={cur}>
                    {cur}
                  </option>
                ))}
              </select>
            </Field>
          )}
          <Field id={`${uid}-min`} label="From" error={err("min")}>
            <input id={`${uid}-min`} type="number" inputMode="decimal" min={0} value={c.min} onChange={(e) => f.setCompensation({ min: e.target.value })} className={FIELD} aria-invalid={Boolean(err("min"))} />
          </Field>
          <Field id={`${uid}-max`} label="Up to" optional error={err("max")}>
            <input id={`${uid}-max`} type="number" inputMode="decimal" min={0} value={c.max} onChange={(e) => f.setCompensation({ max: e.target.value })} className={FIELD} aria-invalid={Boolean(err("max"))} />
          </Field>
          <label className="text-ink flex items-center gap-2 text-sm sm:col-span-2">
            <input type="checkbox" checked={c.negotiable} onChange={(e) => f.setCompensation({ negotiable: e.target.checked })} className="accent-ember size-4" />
            Negotiable
          </label>
        </div>
      )}
      {c.mode && (
        <Field id={`${uid}-compNote`} label="Anything to add" optional>
          <input id={`${uid}-compNote`} value={c.note} onChange={(e) => f.setCompensation({ note: e.target.value })} maxLength={300} placeholder="Benefits, equity terms, how it's structured…" className={FIELD} />
        </Field>
      )}
    </Section>
  );
}
