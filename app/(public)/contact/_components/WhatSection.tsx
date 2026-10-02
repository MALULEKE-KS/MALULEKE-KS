// app/(public)/contact/_components/WhatSection.tsx
// Let's Talk — "What it is": the kind (subtypes, "Other" opens a box), the
// category's own fields drawn from their spec (lib/inquiries/fields.ts), and
// the message every category shares.

"use client";

import { CATEGORY_FIELDS, FORM_SHAPE, MESSAGE_MAX } from "@/lib/inquiries/fields";
import { cn } from "@/lib/utils";
import { Choices, ErrorText, FIELD, Field, Section, SpecInput } from "./fields";
import type { InquiryForm } from "./use-inquiry-form";

export function WhatSection({ f, uid, step, ownerFirstName }: { f: InquiryForm; uid: string; step: number; ownerFirstName: string }) {
  const { chosen, form, errors } = f;
  const v = (k: string) => f.values[k] ?? "";
  const shown = CATEGORY_FIELDS[form].filter((s) => !s.when || s.when(v));
  const msg = FORM_SHAPE[form].message;
  return (
    <Section id="part-what" step={step} title="What it is" done={f.progress.find((p) => p.key === "what")?.done}>
      {chosen?.subtypes && chosen.subtypes.length > 0 && (
        <div>
          <Choices label="Which kind" value={f.subtype} options={chosen.subtypes} onChange={f.setSubtype} errorId={errors.subtype ? `${uid}-subtype-error` : undefined} />
          <ErrorText id={`${uid}-subtype-error`}>{errors.subtype}</ErrorText>
        </div>
      )}
      {f.subtype === "other" && (
        <Field id={`${uid}-subtypeOther`} label="Describe it" error={errors.subtypeOther}>
          <input id={`${uid}-subtypeOther`} value={f.subtypeOther} onChange={(e) => f.setSubtypeOther(e.target.value)} maxLength={200} className={FIELD} aria-invalid={Boolean(errors.subtypeOther)} />
        </Field>
      )}
      {shown.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2">
          {shown.map((s) => (
            <SpecInput
              key={s.key}
              spec={{ ...s, optional: s.optional || (s.optionalWhen?.(v) ?? false) }}
              id={`${uid}-${s.key}`}
              label={s.label.replace("{owner}", ownerFirstName)}
              value={v(s.key)}
              onChange={(val) => f.setValue(s.key, val)}
              error={errors[`details.${s.key}`]}
            />
          ))}
        </div>
      )}
      <Field id={`${uid}-message`} label={msg.label} error={errors.message} hint={`${msg.hint} ${f.message.trim().length} / ${MESSAGE_MAX}.`}>
        <textarea
          id={`${uid}-message`}
          rows={6}
          value={f.message}
          onChange={(e) => f.setMessage(e.target.value)}
          maxLength={MESSAGE_MAX}
          className={cn(FIELD, "min-h-40 resize-y")}
          aria-invalid={Boolean(errors.message)}
          aria-describedby={errors.message ? `${uid}-message-error` : undefined}
        />
      </Field>
    </Section>
  );
}
