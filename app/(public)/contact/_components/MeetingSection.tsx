// app/(public)/contact/_components/MeetingSection.tsx
// Let's Talk — a meeting or interview already arranged (LT-5). The time is
// kept in the zone it was given in; the visitor's own zone is filled in.

"use client";

import { MEETING_KINDS } from "@/lib/inquiries/forms";
import { FORM_SHAPE, MEETING_KIND_LABEL, type MeetingDraft } from "@/lib/inquiries/fields";
import { Choices, FIELD, Field, Section } from "./fields";
import type { InquiryForm } from "./use-inquiry-form";

const STATUS: { value: MeetingDraft["status"]; label: string }[] = [
  { value: "none", label: "No" },
  { value: "scheduled", label: "Yes" },
  { value: "tbd", label: "To be arranged" },
];

export function MeetingSection({ f, uid, step }: { f: InquiryForm; uid: string; step: number }) {
  const title = FORM_SHAPE[f.form].meeting;
  if (!title) return null;
  const m = f.meeting;
  const err = (k: string) => f.errors[`details.meeting.${k}`];
  return (
    <Section id="part-meeting" step={step} title={title} done={m.status !== "scheduled" || m.startsAtLocal !== ""}>
      <Choices label="Meeting" value={m.status} options={STATUS} onChange={(status) => f.setMeeting({ status })} />
      {m.status === "scheduled" && (
        <div className="grid gap-5 sm:grid-cols-2">
          <Field id={`${uid}-mkind`} label="Kind">
            <select id={`${uid}-mkind`} value={m.kind} onChange={(e) => f.setMeeting({ kind: e.target.value })} className={FIELD}>
              {MEETING_KINDS.map((k) => (
                <option key={k} value={k}>
                  {MEETING_KIND_LABEL[k]}
                </option>
              ))}
            </select>
          </Field>
          <Field id={`${uid}-mwhen`} label="Date and time" error={err("startsAtLocal")}>
            <input id={`${uid}-mwhen`} type="datetime-local" value={m.startsAtLocal} onChange={(e) => f.setMeeting({ startsAtLocal: e.target.value })} className={FIELD} aria-invalid={Boolean(err("startsAtLocal"))} />
          </Field>
          <Field id={`${uid}-mtz`} label="Time zone" error={err("timeZone")} hint="The zone the time above is in — yours is filled in.">
            <input id={`${uid}-mtz`} value={m.timeZone} onChange={(e) => f.setMeeting({ timeZone: e.target.value })} placeholder="Africa/Johannesburg" className={FIELD} aria-invalid={Boolean(err("timeZone"))} />
          </Field>
          <Field id={`${uid}-mdur`} label="Length in minutes" optional>
            <input id={`${uid}-mdur`} type="number" min={5} max={480} value={m.durationMinutes} onChange={(e) => f.setMeeting({ durationMinutes: e.target.value })} className={FIELD} />
          </Field>
          <Field id={`${uid}-mloc`} label="Platform or place" optional>
            <input id={`${uid}-mloc`} value={m.location} onChange={(e) => f.setMeeting({ location: e.target.value })} maxLength={200} placeholder="Teams, Zoom, an address…" className={FIELD} />
          </Field>
          <Field id={`${uid}-mlink`} label="Meeting link" optional error={err("link")}>
            <input id={`${uid}-mlink`} value={m.link} onChange={(e) => f.setMeeting({ link: e.target.value })} placeholder="https://" className={FIELD} aria-invalid={Boolean(err("link"))} />
          </Field>
          <Field id={`${uid}-mwho`} label="Contact person" optional>
            <input id={`${uid}-mwho`} value={m.contactPerson} onChange={(e) => f.setMeeting({ contactPerson: e.target.value })} maxLength={120} className={FIELD} />
          </Field>
        </div>
      )}
    </Section>
  );
}
