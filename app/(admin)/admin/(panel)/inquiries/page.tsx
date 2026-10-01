// app/(admin)/admin/(panel)/inquiries/page.tsx
// Let's Talk — the inbox (LETS-TALK-SPEC §50–53): search by reference, name,
// email or organisation; filter by status, category, priority, overdue or
// possible duplicate. Each row opens the inquiry in full, where every action
// lives. Server-rendered from the URL, so a filtered view is a link.

import Link from "next/link";
import { CircleAlert, Copy, FileText, Inbox, Search } from "lucide-react";
import type { InquiryPriority, InquiryStatus, Prisma } from "@prisma/client";
import { AdminPageHeader, EmptyState, formatWhen, Pill } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { reviewDeadline, STATUS_LABEL } from "@/lib/rules/inquiries";
import { emailConfigured } from "@/lib/notifications";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_FILTERS: { key: string; label: string; statuses: InquiryStatus[] | null }[] = [
  { key: "open", label: "Open", statuses: ["NEW", "REVIEWED", "NEEDS_INFO", "RESPONDED", "ON_HOLD"] },
  { key: "new", label: "New", statuses: ["NEW"] },
  { key: "reviewing", label: "Reviewing", statuses: ["REVIEWED"] },
  { key: "needs-info", label: "Needs information", statuses: ["NEEDS_INFO"] },
  { key: "discussion", label: "In discussion", statuses: ["RESPONDED"] },
  { key: "on-hold", label: "On hold", statuses: ["ON_HOLD"] },
  { key: "decided", label: "Decided", statuses: ["ACCEPTED", "DECLINED", "WITHDRAWN"] },
  { key: "closed", label: "Closed", statuses: ["CLOSED"] },
  { key: "all", label: "All", statuses: null },
];

const TONE: Partial<Record<InquiryStatus, "attention" | "good" | "critical">> = { NEW: "attention", NEEDS_INFO: "attention", ACCEPTED: "good", DECLINED: "critical" };
const PRIORITIES: InquiryPriority[] = ["URGENT", "HIGH", "NORMAL", "LOW"];

const pill = (active: boolean) =>
  cn(
    "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors",
    active ? "border-ink bg-ink text-paper" : "border-ink/15 bg-sheet text-slate hover:border-ink/30 hover:text-ink",
  );

type Params = { status?: string; inquiryType?: string; priority?: string; overdue?: string; duplicates?: string; q?: string };

export default async function AdminInquiriesPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const status = STATUS_FILTERS.find((f) => f.key === params.status) ?? STATUS_FILTERS[0]!;
  const q = params.q?.trim().slice(0, 120) ?? "";
  const priority = PRIORITIES.find((p) => p.toLowerCase() === params.priority);
  const slaHours = await getSetting("inquiry.reviewSlaHours");
  const now = new Date();
  const dueBefore = new Date(now.getTime() - slaHours * 60 * 60 * 1000);

  const where: Prisma.InquiryWhereInput = {
    ...(params.overdue === "1" ? { status: "NEW", createdAt: { lt: dueBefore } } : status.statuses && { status: { in: status.statuses } }),
    ...(params.inquiryType && { inquiryType: { key: params.inquiryType } }),
    ...(priority && { priority }),
    ...(params.duplicates === "1" && { possibleDuplicateOfId: { not: null } }),
    ...(q && {
      OR: [
        { reference: { contains: q, mode: "insensitive" } },
        { name: { contains: q, mode: "insensitive" } },
        { email: { contains: q, mode: "insensitive" } },
        { organization: { contains: q, mode: "insensitive" } },
      ],
    }),
  };
  const [inquiries, types, overdueCount, failedEmails] = await Promise.all([
    db.inquiry.findMany({
      where,
      include: { inquiryType: true, subtype: true, _count: { select: { documents: true, meetings: true } } },
      orderBy: [{ createdAt: "desc" }],
      take: 200,
    }),
    db.inquiryType.findMany({ orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { label: "asc" }] }),
    db.inquiry.count({ where: { status: "NEW", createdAt: { lt: dueBefore } } }),
    db.notification.count({ where: { state: "FAILED" } }),
  ]);

  function href(next: Partial<Params>) {
    const merged = { ...params, ...next };
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) qs.set(k, v);
    const s = qs.toString();
    return s ? `/admin/inquiries?${s}` : "/admin/inquiries";
  }

  return (
    <>
      <AdminPageHeader
        icon={Inbox}
        title="Inquiries"
        description={`Everything sent through Let's Talk. A new message is due for review within ${slaHours} hours (BR-2.2 — a setting).`}
      />

      {(!emailConfigured() || failedEmails > 0) && (
        <p className="border-ink/10 bg-sheet text-slate mb-5 flex items-start gap-2 rounded-2xl border px-4 py-3 text-sm">
          <CircleAlert aria-hidden="true" className="text-accent mt-0.5 size-4 shrink-0" />
          {!emailConfigured()
            ? "Email isn't connected yet, so alerts wait in the outbox. Add the Resend integration in Vercel (RESEND_API_KEY) and they'll go out."
            : `${failedEmails} email${failedEmails === 1 ? "" : "s"} failed — open the inquiry to see why and retry.`}
        </p>
      )}

      <form action="/admin/inquiries" className="mb-4 flex gap-2">
        {Object.entries(params).map(([k, v]) => (k !== "q" && v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
        <label htmlFor="inquiry-search" className="sr-only">
          Search inquiries
        </label>
        <div className="border-ink/15 bg-sheet focus-within:border-ink/40 flex flex-1 items-center gap-2 rounded-full border px-4">
          <Search aria-hidden="true" className="text-slate size-4" />
          <input id="inquiry-search" name="q" defaultValue={q} placeholder="Reference, name, email or organisation" className="h-10 flex-1 bg-transparent text-sm outline-none" />
        </div>
      </form>

      <nav aria-label="Filter by status" className="mb-3 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <Link key={f.key} href={href({ status: f.key, overdue: undefined })} aria-current={params.overdue !== "1" && f.key === status.key ? "page" : undefined} className={pill(params.overdue !== "1" && f.key === status.key)}>
            {f.label}
          </Link>
        ))}
        <Link href={href({ overdue: params.overdue === "1" ? undefined : "1" })} aria-current={params.overdue === "1" ? "page" : undefined} className={pill(params.overdue === "1")}>
          Overdue <span className={cn("font-mono text-xs", overdueCount > 0 ? "text-accent" : "text-slate/70")}>{overdueCount}</span>
        </Link>
        <Link href={href({ duplicates: params.duplicates === "1" ? undefined : "1" })} className={pill(params.duplicates === "1")}>
          <Copy aria-hidden="true" className="size-3.5" /> Possible duplicates
        </Link>
      </nav>
      <nav aria-label="Filter by category and priority" className="mb-6 flex flex-wrap gap-2">
        <Link href={href({ inquiryType: undefined })} className={cn(pill(!params.inquiryType), "px-3 py-1 text-xs")}>
          All categories
        </Link>
        {types.map((t) => (
          <Link key={t.id} href={href({ inquiryType: t.key })} className={cn(pill(params.inquiryType === t.key), "px-3 py-1 text-xs", !t.active && "opacity-70")}>
            {t.label}
            {!t.active && " (retired)"}
          </Link>
        ))}
        <span aria-hidden="true" className="bg-ink/10 mx-1 w-px" />
        {PRIORITIES.map((p) => (
          <Link key={p} href={href({ priority: priority === p ? undefined : p.toLowerCase() })} className={cn(pill(priority === p), "px-3 py-1 text-xs")}>
            {p.charAt(0) + p.slice(1).toLowerCase()}
          </Link>
        ))}
      </nav>

      {inquiries.length === 0 ? (
        <EmptyState icon={Inbox}>{q ? `Nothing matches "${q}".` : "No inquiries here."}</EmptyState>
      ) : (
        <ul className="border-ink/10 bg-sheet divide-ink/10 divide-y overflow-hidden rounded-2xl border">
          {inquiries.map((i) => {
            const { overdue } = reviewDeadline(i, slaHours, now);
            return (
              <li key={i.id}>
                <Link href={`/admin/inquiries/${i.id}`} className="hover:bg-ink/[0.03] flex flex-col gap-2 px-4 py-3.5 transition-colors sm:flex-row sm:items-center sm:gap-4">
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs">{i.reference}</span>
                      <Pill tone={TONE[i.status] ?? "neutral"}>{STATUS_LABEL[i.status]}</Pill>
                      {i.priority !== "NORMAL" && <Pill tone={i.priority === "URGENT" || i.priority === "HIGH" ? "attention" : "neutral"}>{i.priority.toLowerCase()}</Pill>}
                      {overdue && <Pill tone="critical">Overdue</Pill>}
                      {i.possibleDuplicateOfId && <Pill tone="neutral">Possible duplicate</Pill>}
                    </span>
                    <span className="text-ink mt-1 block truncate text-sm font-medium">
                      {i.anonymizedAt ? "Anonymised after retention" : [i.name, i.organization].filter(Boolean).join(" · ")}
                    </span>
                    <span className="text-slate block truncate text-xs">
                      {i.inquiryType.label}
                      {i.subtype && ` — ${i.subtype.label}`}
                    </span>
                  </span>
                  <span className="text-slate flex shrink-0 items-center gap-3 text-xs">
                    {i._count.documents > 0 && (
                      <span className="inline-flex items-center gap-1">
                        <FileText aria-hidden="true" className="size-3.5" />
                        {i._count.documents}
                      </span>
                    )}
                    {formatWhen(i.createdAt)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
