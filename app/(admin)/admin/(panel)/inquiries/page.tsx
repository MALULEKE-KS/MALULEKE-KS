// app/(admin)/admin/(panel)/inquiries/page.tsx
// Triage inbox (#105), filterable by status, type and "overdue" (NEW past
// the admin-set review window, BR-2.2). Transition buttons only ever offer
// the valid next step(s) per BR-2.1 (reviewed can go to responded OR closed —
// never a skip-ahead option).
// See docs/PAGE-SPECIFICATIONS.md ("/admin/inquiries").

import Link from "next/link";
import { Inbox } from "lucide-react";
import type { InquiryStatus, Prisma } from "@prisma/client";
import { AdminPageHeader } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { reviewDeadline, STATUS_TO_API } from "@/lib/rules/inquiries";
import { cn } from "@/lib/utils";
import { InquiriesTriage } from "./_components/InquiriesTriage";

export const dynamic = "force-dynamic";

const STATUS_FILTERS: { key: string; label: string; dbValue: InquiryStatus | null }[] = [
  { key: "all", label: "All", dbValue: null },
  { key: "new", label: "New", dbValue: "NEW" },
  { key: "reviewed", label: "Reviewed", dbValue: "REVIEWED" },
  { key: "responded", label: "Responded", dbValue: "RESPONDED" },
  { key: "closed", label: "Closed", dbValue: "CLOSED" },
];

const pill = (active: boolean) =>
  cn(
    "inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm transition-colors",
    active ? "border-ink bg-ink text-paper" : "border-ink/15 bg-sheet text-slate hover:border-ink/30 hover:text-ink",
  );

export default async function AdminInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; inquiryType?: string; overdue?: string }>;
}) {
  const params = await searchParams;
  const overdueOnly = params.overdue === "1";
  const status = overdueOnly ? STATUS_FILTERS[1]! : (STATUS_FILTERS.find((f) => f.key === params.status) ?? STATUS_FILTERS[0]!);
  const slaHours = await getSetting("inquiry.reviewSlaHours");
  const now = new Date(); // request time: this page renders per request
  const dueBefore = new Date(now.getTime() - slaHours * 60 * 60 * 1000);

  const where: Prisma.InquiryWhereInput = {
    ...(status.dbValue && { status: status.dbValue }),
    ...(params.inquiryType && { inquiryType: { key: params.inquiryType } }),
    ...(overdueOnly && { createdAt: { lt: dueBefore } }),
  };
  const [inquiries, types, overdueCount] = await Promise.all([
    db.inquiry.findMany({ where, include: { inquiryType: true }, orderBy: [{ status: "asc" }, { createdAt: "asc" }] }),
    db.inquiryType.findMany({ where: { active: true }, orderBy: { label: "asc" } }),
    db.inquiry.count({ where: { status: "NEW", createdAt: { lt: dueBefore } } }),
  ]);

  const rows = inquiries.map((i) => {
    const { reviewDueAt, overdue } = reviewDeadline(i, slaHours, now);
    return {
      id: i.id,
      status: STATUS_TO_API[i.status],
      name: i.name,
      email: i.email,
      message: i.message,
      source: i.source,
      inquiryTypeLabel: i.inquiryType.label,
      submittedAt: i.createdAt.toISOString(),
      reviewDueAt: reviewDueAt.toISOString(),
      overdue,
      anonymized: i.anonymizedAt !== null,
    };
  });

  function href(next: { status?: string; inquiryType?: string | null; overdue?: boolean }) {
    const qs = new URLSearchParams();
    const s = next.status ?? (overdueOnly ? "all" : status.key);
    const t = next.inquiryType === undefined ? params.inquiryType : next.inquiryType;
    if (next.overdue) qs.set("overdue", "1");
    else if (s !== "all") qs.set("status", s);
    if (t) qs.set("inquiryType", t);
    const q = qs.toString();
    return q ? `/admin/inquiries?${q}` : "/admin/inquiries";
  }

  return (
    <>
      <AdminPageHeader
        icon={Inbox}
        title="Inquiries"
        description={`Everything sent through the contact form. A new inquiry is due for review within ${slaHours} hours (BR-2.2) — the window is a setting.`}
      />

      <nav aria-label="Filter inquiries" className="mb-3 flex flex-wrap gap-2">
        {STATUS_FILTERS.map((f) => (
          <Link key={f.key} href={href({ status: f.key })} aria-current={!overdueOnly && f.key === status.key ? "page" : undefined} className={pill(!overdueOnly && f.key === status.key)}>
            {f.label}
          </Link>
        ))}
        <Link href={href({ overdue: true })} aria-current={overdueOnly ? "page" : undefined} className={pill(overdueOnly)}>
          Overdue <span className={cn("font-mono text-xs", overdueOnly ? "text-mist" : overdueCount > 0 ? "text-accent" : "text-slate/70")}>{overdueCount}</span>
        </Link>
      </nav>
      <nav aria-label="Filter by type" className="mb-6 flex flex-wrap gap-2">
        <Link href={href({ inquiryType: null })} className={cn(pill(!params.inquiryType), "px-3 py-1 text-xs")}>All types</Link>
        {types.map((t) => (
          <Link key={t.id} href={href({ inquiryType: t.key })} className={cn(pill(params.inquiryType === t.key), "px-3 py-1 text-xs")}>
            {t.label}
          </Link>
        ))}
      </nav>

      <InquiriesTriage inquiries={rows} />
    </>
  );
}
