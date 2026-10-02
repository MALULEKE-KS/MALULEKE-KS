// app/(admin)/admin/(panel)/inquiries/[id]/_components/Workbench.tsx
// The actions on one inquiry (LETS-TALK-SPEC LT-5, LT-6, LT-7, LT-10): move
// it on (only the moves allowed, with a private reason and — separately — an
// optional message for the applicant), set its priority, write a private
// note, write to the applicant or ask for information, schedule and update
// meetings, retry an email. Each sends the version it was opened at, so a
// stale screen can't overwrite a newer change.

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Send } from "lucide-react";
import { adminButton, adminHint, adminInput, adminLabel } from "@/components/admin/ui";
import { adminRequest } from "@/lib/admin/request";
import { cn } from "@/lib/utils";

function useAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  async function run(path: string, method: "POST" | "PATCH", body: unknown, done = "Saved.") {
    setBusy(true);
    setMessage(null);
    const res = await adminRequest(path, { method, body });
    setBusy(false);
    if (!res.ok) {
      setMessage({ ok: false, text: res.message });
      return false;
    }
    setMessage({ ok: true, text: done });
    router.refresh();
    return true;
  }
  const status = message && <p role="status" className={cn("text-sm", message.ok ? "text-signal-finished" : "text-critical")}>{message.text}</p>;
  return { busy, run, status };
}

export function StatusActions({ id, version, next }: { id: string; version: number; next: { status: string; label: string }[] }) {
  const { busy, run, status } = useAction();
  const [target, setTarget] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [toApplicant, setToApplicant] = useState("");
  if (next.length === 0) return null;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Move this inquiry to">
        {next.map((n) => (
          <button key={n.status} type="button" onClick={() => setTarget(target === n.status ? null : n.status)} aria-pressed={target === n.status} className={target === n.status ? adminButton.primary : adminButton.secondary}>
            {n.label}
          </button>
        ))}
      </div>
      {target && (
        <form
          className="border-ink/10 space-y-3 rounded-2xl border p-4"
          onSubmit={async (e) => {
            e.preventDefault();
            const ok = await run(`/inquiries/${id}`, "PATCH", { status: target, expectedVersion: version, internalReason: reason || undefined, applicantMessage: toApplicant || undefined }, "Moved.");
            if (ok) {
              setTarget(null);
              setReason("");
              setToApplicant("");
            }
          }}
        >
          <div>
            <label htmlFor="reason" className={adminLabel}>
              <Lock aria-hidden="true" className="mr-1 inline size-3.5" /> Private reason (optional)
            </label>
            <textarea id="reason" value={reason} onChange={(e) => setReason(e.target.value)} maxLength={2000} rows={2} className={adminInput} />
            <p className={adminHint}>Only you see this — it never reaches the applicant.</p>
          </div>
          <div>
            <label htmlFor="to-applicant" className={adminLabel}>
              Message to the applicant (optional)
            </label>
            <textarea id="to-applicant" value={toApplicant} onChange={(e) => setToApplicant(e.target.value)} maxLength={5000} rows={3} className={adminInput} />
            <p className={adminHint}>Stored as what they were told; emailed only when applicant emails are on.</p>
          </div>
          <div className="flex items-center gap-3">
            <button type="submit" disabled={busy} className={adminButton.primary}>
              {busy ? "Saving…" : `Move to ${next.find((n) => n.status === target)?.label}`}
            </button>
            {status}
          </div>
        </form>
      )}
      {!target && status}
    </div>
  );
}

export function PriorityPicker({ id, priority }: { id: string; priority: string }) {
  const { busy, run, status } = useAction();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor="priority" className="text-slate text-sm">
        Priority
      </label>
      <select id="priority" defaultValue={priority} disabled={busy} onChange={(e) => run(`/inquiries/${id}`, "PATCH", { priority: e.target.value })} className={cn(adminInput, "w-auto py-1.5")}>
        {["urgent", "high", "normal", "low"].map((p) => (
          <option key={p} value={p}>
            {p[0]!.toUpperCase() + p.slice(1)}
          </option>
        ))}
      </select>
      {status}
    </div>
  );
}

export function NoteComposer({ id }: { id: string }) {
  const { busy, run, status } = useAction();
  const [body, setBody] = useState("");
  return (
    <form
      className="space-y-2"
      onSubmit={async (e) => {
        e.preventDefault();
        if (await run(`/inquiries/${id}/notes`, "POST", { body }, "Note added.")) setBody("");
      }}
    >
      <label htmlFor="note" className="sr-only">
        Private note
      </label>
      <textarea id="note" value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000} rows={2} placeholder="A private note — never shown to the applicant" className={adminInput} />
      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy || !body.trim()} className={adminButton.secondary}>
          <Lock aria-hidden="true" /> Add note
        </button>
        {status}
      </div>
    </form>
  );
}

export function MessageComposer({ id, disabled }: { id: string; disabled: boolean }) {
  const { busy, run, status } = useAction();
  const [kind, setKind] = useState<"message" | "info-request">("message");
  const [body, setBody] = useState("");
  const [items, setItems] = useState("");
  const [due, setDue] = useState("");
  if (disabled) return <p className="text-slate text-sm">Anonymised after the retention period — there&rsquo;s no one to write to.</p>;
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const requestedItems = items.split("\n").map((s) => s.trim()).filter(Boolean);
        const ok = await run(`/inquiries/${id}/messages`, "POST", { kind, body, ...(kind === "info-request" && { requestedItems }), ...(due && { dueAt: new Date(due).toISOString() }) }, "Recorded.");
        if (ok) {
          setBody("");
          setItems("");
          setDue("");
        }
      }}
    >
      <div className="flex gap-2" role="group" aria-label="What kind of message">
        {(["message", "info-request"] as const).map((k) => (
          <button key={k} type="button" onClick={() => setKind(k)} aria-pressed={kind === k} className={kind === k ? adminButton.primary : adminButton.secondary}>
            {k === "message" ? "Message" : "Ask for information"}
          </button>
        ))}
      </div>
      <label htmlFor="msg" className="sr-only">
        Message to the applicant
      </label>
      <textarea id="msg" value={body} onChange={(e) => setBody(e.target.value)} maxLength={5000} rows={3} placeholder="What the applicant will read" className={adminInput} />
      {kind === "info-request" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label htmlFor="items" className={adminLabel}>
              What you need (one per line)
            </label>
            <textarea id="items" value={items} onChange={(e) => setItems(e.target.value)} rows={3} placeholder={"CV\nCompany profile"} className={adminInput} />
          </div>
          <div>
            <label htmlFor="due" className={adminLabel}>
              By (optional)
            </label>
            <input id="due" type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} className={adminInput} />
          </div>
        </div>
      )}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy || !body.trim()} className={adminButton.primary}>
          <Send aria-hidden="true" /> {kind === "message" ? "Record message" : "Record request"}
        </button>
        {status}
      </div>
      <p className={adminHint}>Asking for information doesn&rsquo;t change the status — move it to &ldquo;Needs information&rdquo; above if you&rsquo;re waiting on them.</p>
    </form>
  );
}

const MEETING_KINDS = ["hr", "technical", "manager", "panel", "discovery", "client", "general", "other"];

export function MeetingScheduler({ id, defaultTimeZone }: { id: string; defaultTimeZone: string }) {
  const { busy, run, status } = useAction();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ kind: "discovery", startsAtLocal: "", timeZone: defaultTimeZone, durationMinutes: "30", location: "", link: "", contactPerson: "" });
  if (!open)
    return (
      <button type="button" onClick={() => setOpen(true)} className={adminButton.secondary}>
        Schedule a meeting
      </button>
    );
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <form
      className="border-ink/10 grid gap-3 rounded-2xl border p-4 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const ok = await run(`/inquiries/${id}/meetings`, "POST", {
          kind: f.kind,
          startsAtLocal: f.startsAtLocal,
          timeZone: f.timeZone,
          durationMinutes: Number(f.durationMinutes) || undefined,
          location: f.location || undefined,
          link: f.link || undefined,
          contactPerson: f.contactPerson || undefined,
        }, "Scheduled.");
        if (ok) setOpen(false);
      }}
    >
      <div>
        <label htmlFor="m-kind" className={adminLabel}>Kind</label>
        <select id="m-kind" value={f.kind} onChange={set("kind")} className={adminInput}>
          {MEETING_KINDS.map((k) => <option key={k} value={k}>{k}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="m-when" className={adminLabel}>When (in the meeting&rsquo;s time zone)</label>
        <input id="m-when" type="datetime-local" required value={f.startsAtLocal} onChange={set("startsAtLocal")} className={adminInput} />
      </div>
      <div>
        <label htmlFor="m-tz" className={adminLabel}>Time zone</label>
        <input id="m-tz" required value={f.timeZone} onChange={set("timeZone")} placeholder="Africa/Johannesburg" className={adminInput} />
      </div>
      <div>
        <label htmlFor="m-dur" className={adminLabel}>Minutes</label>
        <input id="m-dur" type="number" min={5} max={480} value={f.durationMinutes} onChange={set("durationMinutes")} className={adminInput} />
      </div>
      <div>
        <label htmlFor="m-loc" className={adminLabel}>Platform or place</label>
        <input id="m-loc" value={f.location} onChange={set("location")} className={adminInput} />
      </div>
      <div>
        <label htmlFor="m-link" className={adminLabel}>Link</label>
        <input id="m-link" value={f.link} onChange={set("link")} placeholder="https://" className={adminInput} />
      </div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button type="submit" disabled={busy} className={adminButton.primary}>{busy ? "Saving…" : "Schedule"}</button>
        <button type="button" onClick={() => setOpen(false)} className={adminButton.ghost}>Cancel</button>
        {status}
      </div>
    </form>
  );
}

export function MeetingStateButtons({ id, meetingId }: { id: string; meetingId: string }) {
  const { busy, run, status } = useAction();
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      {[
        ["completed", "Completed"],
        ["no_show", "No-show"],
        ["cancelled", "Cancel"],
      ].map(([s, label]) => (
        <button key={s} type="button" disabled={busy} onClick={() => run(`/inquiries/${id}/meetings/${meetingId}`, "PATCH", { state: s })} className={cn(adminButton.ghost, "px-2 py-1 text-xs")}>
          {label}
        </button>
      ))}
      {status}
    </span>
  );
}

export function RetryEmail({ notificationId }: { notificationId: string }) {
  const { busy, run, status } = useAction();
  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" disabled={busy} onClick={() => run(`/notifications/${notificationId}/retry`, "POST", {}, "Retried.")} className={cn(adminButton.ghost, "px-2 py-1 text-xs")}>
        Retry now
      </button>
      {status}
    </span>
  );
}
