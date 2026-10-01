// app/(admin)/admin/(panel)/inquiries/[id]/page.tsx
// One Let's Talk inquiry in full (LETS-TALK-SPEC §54): overview and actions,
// who they are and how they want to be reached, what they asked for (the
// category's own fields), compensation, meetings, documents, the status
// history, what the applicant was told, private notes, and the emails sent.
// Private and applicant-facing are always visibly different (LT-7).

import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, Copy, FileText, Inbox, Lock, Mail, MessageSquare, ScrollText } from "lucide-react";
import { AdminPageHeader, formatWhen, Panel, Pill } from "@/components/admin/ui";
import { inquiryDetail } from "@/lib/inquiries/admin";
import { MeetingScheduler, MeetingStateButtons, MessageComposer, NoteComposer, PriorityPicker, RetryEmail, StatusActions } from "./_components/Workbench";

export const dynamic = "force-dynamic";

const LABELS: Record<string, string> = {
  jobTitle: "Role",
  seniority: "Seniority",
  representation: "Hiring for",
  representationNote: "On behalf of",
  workArrangement: "Arrangement",
  workArrangementNote: "Arrangement detail",
  location: "Location",
  startDate: "Start date",
  applicationDeadline: "Apply by",
  projectName: "Project",
  desiredOutcome: "Desired outcome",
  existingSystem: "Existing system",
  timeline: "Timeline",
  stage: "Stage",
  expectedContribution: "Expected from Kurhula",
  commitment: "Commitment",
  objective: "Objective",
  targetAudience: "Audience",
  currentPresence: "Current presence",
};

function money(n: number | undefined, currency: string | undefined) {
  if (n === undefined) return "";
  try {
    return currency ? new Intl.NumberFormat("en-ZA", { style: "currency", currency, maximumFractionDigits: 0 }).format(n) : n.toLocaleString("en-ZA");
  } catch {
    return `${currency ?? ""} ${n.toLocaleString("en-ZA")}`.trim();
  }
}

function compensationLine(c: Record<string, unknown> | undefined): string | null {
  if (!c) return null;
  if (c.mode === "discuss") return "Prefers to discuss";
  if (c.mode === "unpaid") return "Unpaid";
  if (c.mode === "not-applicable") return "Not applicable";
  const range = [money(c.min as number | undefined, c.currency as string | undefined), money(c.max as number | undefined, c.currency as string | undefined)].filter(Boolean).join(" – ");
  return [range, c.structure && `(${String(c.structure).replace("-", " ")})`, c.negotiable && "negotiable", c.note].filter(Boolean).join(" ");
}

function when(iso: string, timeZone: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short", timeZone, timeZoneName: "short" }).format(new Date(iso));
  } catch {
    return iso;
  }
}

export default async function InquiryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const i = await inquiryDetail(id);
  if (!i) notFound();
  const { compensation, meeting: _meeting, ...fields } = i.details as Record<string, unknown> & { compensation?: Record<string, unknown> };
  const comp = compensationLine(compensation);
  const contactRows = [
    ["Email", i.email],
    ["Phone", i.phone],
    ["Organisation", i.organization],
    ["Role", i.role],
    ["Website", i.website],
    ["Profile", i.profileUrl],
    ["Prefers", i.preferredChannel === "other" ? `Other — ${i.preferredChannelOther}` : i.preferredChannel],
    ["Came from", i.source],
  ].filter((r): r is [string, string] => Boolean(r[1]));

  return (
    <>
      <Link href="/admin/inquiries" className="text-slate hover:text-ink mb-4 inline-flex items-center gap-1.5 text-sm">
        <ArrowLeft aria-hidden="true" className="size-4" /> Inquiries
      </Link>
      <AdminPageHeader
        icon={Inbox}
        title={i.anonymized ? `${i.reference} · anonymised` : `${i.reference} · ${i.name}`}
        description={`${i.category.label}${i.subtype ? ` — ${i.subtype.label}${i.subtypeOther ? `: ${i.subtypeOther}` : ""}` : ""} · sent ${formatWhen(i.submittedAt)}`}
      />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <Panel title={`Status: ${i.statusLabel}`} description="Only the moves the workflow allows are offered; the database refuses any other. A decision can be reopened — the history stays.">
            <div className="space-y-4">
              <StatusActions id={i.id} version={i.version} next={i.nextStatuses} />
              <PriorityPicker id={i.id} priority={i.priority} />
              {i.possibleDuplicateOf && (
                <p className="text-slate flex items-center gap-2 text-sm">
                  <Copy aria-hidden="true" className="size-4" /> Possible duplicate of{" "}
                  <Link href={`/admin/inquiries/${i.possibleDuplicateOf.id}`} className="text-ink font-mono underline-offset-2 hover:underline">
                    {i.possibleDuplicateOf.reference}
                  </Link>{" "}
                  — same address and category. Nothing was removed.
                </p>
              )}
            </div>
          </Panel>

          <Panel title="What they wrote">
            <p className="text-ink text-sm leading-relaxed whitespace-pre-wrap">{i.message}</p>
            {(Object.keys(fields).length > 0 || comp) && (
              <dl className="border-ink/10 mt-5 grid gap-x-6 gap-y-3 border-t pt-5 text-sm sm:grid-cols-2">
                {Object.entries(fields).map(([k, v]) =>
                  v === undefined || v === null || v === "" ? null : (
                    <div key={k} className="min-w-0">
                      <dt className="text-slate text-xs">{LABELS[k] ?? k}</dt>
                      <dd className="text-ink break-words whitespace-pre-wrap">{String(v).replace(/-/g, " ")}</dd>
                    </div>
                  ),
                )}
                {comp && (
                  <div className="sm:col-span-2">
                    <dt className="text-slate text-xs">Compensation</dt>
                    <dd className="text-ink">{comp}</dd>
                  </div>
                )}
              </dl>
            )}
          </Panel>

          <Panel title="Meetings" description="Events with their own time zone — never a status.">
            <ul className="mb-4 space-y-2">
              {i.meetings.length === 0 && <li className="text-slate text-sm">None yet.</li>}
              {i.meetings.map((m) => (
                <li key={m.id} className="border-ink/10 flex flex-wrap items-center gap-2 rounded-xl border px-3 py-2 text-sm">
                  <CalendarClock aria-hidden="true" className="text-accent size-4" />
                  <span className="text-ink font-medium">{m.kind}</span>
                  <span>{when(m.startsAt, m.timeZone)}</span>
                  <span className="text-slate text-xs">({m.timeZone})</span>
                  <Pill tone={m.state === "completed" ? "good" : m.state === "cancelled" || m.state === "no_show" ? "critical" : "neutral"}>{m.state.replace("_", "-")}</Pill>
                  {m.location && <span className="text-slate">· {m.location}</span>}
                  {m.link && <span className="text-slate break-all">· {m.link}</span>}
                  {(m.state === "scheduled" || m.state === "rescheduled") && <MeetingStateButtons id={i.id} meetingId={m.id} />}
                </li>
              ))}
            </ul>
            <MeetingScheduler id={i.id} defaultTimeZone={i.meetings[0]?.timeZone ?? "Africa/Johannesburg"} />
          </Panel>

          <Panel title="To the applicant" description="What they were told — the only thing an applicant could ever see.">
            <ul className="mb-4 space-y-2">
              {i.messages.map((m) => (
                <li key={m.id} className="border-ink/10 rounded-xl border px-3 py-2 text-sm">
                  <p className="text-slate flex flex-wrap items-center gap-2 text-xs">
                    <MessageSquare aria-hidden="true" className="size-3.5" /> {m.kind.replace("-", " ")} · {m.channel === "manual" ? "send it yourself" : "by email"} · {formatWhen(m.at)}
                  </p>
                  <p className="text-ink mt-1 whitespace-pre-wrap">{m.body}</p>
                  {m.requestedItems.length > 0 && <p className="text-slate mt-1 text-xs">Asked for: {m.requestedItems.join(", ")}</p>}
                </li>
              ))}
            </ul>
            <MessageComposer id={i.id} disabled={i.anonymized} />
          </Panel>
        </div>

        <div className="min-w-0 space-y-6">
          <Panel title="Who">
            <dl className="space-y-2 text-sm">
              {contactRows.map(([k, v]) => (
                <div key={k} className="flex gap-3">
                  <dt className="text-slate w-24 shrink-0 text-xs">{k}</dt>
                  <dd className="text-ink min-w-0 break-all">{v}</dd>
                </div>
              ))}
            </dl>
            <p className="text-slate mt-3 text-xs">Links are shown as text — open them only if you trust them.</p>
          </Panel>

          {i.documents.length > 0 && (
            <Panel title="Documents" description="PDFs, checked by their bytes. Downloaded, never opened in the page.">
              <ul className="space-y-2 text-sm">
                {i.documents.map((d) => (
                  <li key={d.id}>
                    <a href={`/api/v1/admin/inquiries/${i.id}/documents/${d.id}`} className="text-ink hover:text-accent inline-flex items-center gap-2">
                      <FileText aria-hidden="true" className="size-4" /> {d.fileName} <span className="text-slate text-xs">({Math.ceil(d.byteSize / 1024)} KB)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel title="Private notes" description="Yours alone.">
            <NoteComposer id={i.id} />
            <ul className="mt-4 space-y-2">
              {i.notes.map((n) => (
                <li key={n.id} className="bg-ink/[0.03] rounded-xl px-3 py-2 text-sm">
                  <p className="text-slate flex items-center gap-1.5 text-xs">
                    <Lock aria-hidden="true" className="size-3" /> {formatWhen(n.at)}
                  </p>
                  <p className="text-ink mt-1 whitespace-pre-wrap">{n.body}</p>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="History" description="Written by the database itself — append-only.">
            <ol className="space-y-2 text-sm">
              {i.history.map((h, n) => (
                <li key={n} className="flex gap-2">
                  <ScrollText aria-hidden="true" className="text-slate mt-0.5 size-3.5 shrink-0" />
                  <span className="min-w-0">
                    <span className="text-ink">{h.from ? `${h.from} → ${h.to}` : `Received as ${h.to}`}</span>
                    <span className="text-slate block text-xs">{formatWhen(h.at)}</span>
                    {h.internalReason && <span className="text-slate block text-xs">Private: {h.internalReason}</span>}
                    {h.applicantMessage && <span className="text-slate block text-xs">Told them: {h.applicantMessage}</span>}
                  </span>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel title="Emails" description="The outbox for this inquiry. A failed send never undoes anything.">
            <ul className="space-y-2 text-sm">
              {i.notifications.length === 0 && <li className="text-slate">None.</li>}
              {i.notifications.map((n) => (
                <li key={n.id} className="flex flex-wrap items-center gap-2">
                  <Mail aria-hidden="true" className="text-slate size-3.5" />
                  <span className="text-ink">{n.kind === "owner-alert" ? "Alert to you" : "To the applicant"}</span>
                  <Pill tone={n.state === "sent" ? "good" : n.state === "failed" ? "critical" : "neutral"}>{n.state === "pending" ? "waiting" : n.state}</Pill>
                  {n.lastError && <span className="text-slate block w-full text-xs">{n.lastError}</span>}
                  {n.state !== "sent" && <RetryEmail notificationId={n.id} />}
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>
    </>
  );
}
