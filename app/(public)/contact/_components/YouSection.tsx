// app/(public)/contact/_components/YouSection.tsx
// Let's Talk — who's writing and how to reach them. Organisation fields only
// where an organisation is likely; a phone number only when the chosen way
// to reach them needs one.

"use client";

import { CHANNELS } from "@/lib/inquiries/forms";
import { CHANNEL_LABEL, FORM_SHAPE, type ContactDraft } from "@/lib/inquiries/fields";
import { Choices, FIELD, Field, Section } from "./fields";
import type { InquiryForm } from "./use-inquiry-form";

type TextKey = Exclude<keyof ContactDraft, "preferredChannel">;
const ORGANISATION: { key: TextKey; label: string; type?: string; autoComplete?: string; max?: number; placeholder?: string }[] = [
  { key: "organization", label: "Organisation", autoComplete: "organization", max: 160 },
  { key: "role", label: "Your role", autoComplete: "organization-title", max: 120 },
  { key: "organizationWebsite", label: "Website", type: "url", autoComplete: "url", placeholder: "https://" },
  { key: "profileUrl", label: "LinkedIn or profile", type: "url", placeholder: "https://" },
];

export function YouSection({ f, uid, step }: { f: InquiryForm; uid: string; step: number }) {
  const c = f.contact;
  const e = f.errors;
  const input = (key: TextKey, extra: { type?: string; autoComplete?: string; max?: number; placeholder?: string } = {}) => (
    <input
      id={`${uid}-${key}`}
      type={extra.type ?? "text"}
      autoComplete={extra.autoComplete}
      value={c[key]}
      onChange={(ev) => f.setContact({ [key]: ev.target.value })}
      maxLength={extra.max}
      placeholder={extra.placeholder}
      className={FIELD}
      aria-invalid={Boolean(e[key])}
      aria-describedby={e[key] ? `${uid}-${key}-error` : undefined}
    />
  );
  const needsPhone = c.preferredChannel === "phone" || c.preferredChannel === "whatsapp" || c.preferredChannel === "sms" || c.phone !== "";
  return (
    <Section id="part-you" step={step} title="You" done={f.progress.find((p) => p.key === "you")?.done}>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id={`${uid}-name`} label="Name" error={e.name}>
          {input("name", { autoComplete: "name", max: 200 })}
        </Field>
        <Field id={`${uid}-email`} label="Email" error={e.email}>
          {input("email", { type: "email", autoComplete: "email", max: 254 })}
        </Field>
        {FORM_SHAPE[f.form].organisation &&
          ORGANISATION.map((o) => (
            <Field key={o.key} id={`${uid}-${o.key}`} label={o.label} optional error={e[o.key]}>
              {input(o.key, o)}
            </Field>
          ))}
      </div>
      <div>
        <p className="text-ink mb-2 text-sm font-medium" id={`${uid}-channel-label`}>
          Best way to reach you
        </p>
        <Choices labelledBy={`${uid}-channel-label`} value={c.preferredChannel} options={CHANNELS.map((ch) => ({ value: ch, label: CHANNEL_LABEL[ch] }))} onChange={(preferredChannel) => f.setContact({ preferredChannel })} />
      </div>
      {needsPhone && (
        <Field id={`${uid}-phone`} label={c.preferredChannel === "whatsapp" ? "WhatsApp number" : "Phone number"} error={e.phone}>
          {input("phone", { type: "tel", autoComplete: "tel", placeholder: "+27 82 123 4567" })}
        </Field>
      )}
      {c.preferredChannel === "other" && (
        <Field id={`${uid}-preferredChannelOther`} label="How should he reach you?" error={e.preferredChannelOther}>
          {input("preferredChannelOther", { max: 120 })}
        </Field>
      )}
    </Section>
  );
}
