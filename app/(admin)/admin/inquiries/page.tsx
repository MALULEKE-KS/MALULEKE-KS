// app/(admin)/admin/inquiries/page.tsx
// Triage inbox, grouped/filterable by status and type. Status-transition
// buttons only ever offer the valid next step(s) per BR-2.1 (reviewed can
// go to responded OR closed — never a skip-ahead option).
// See docs/PAGE-SPECIFICATIONS.md ("/admin/inquiries").

import Link from "next/link";
import { db } from "@/lib/db";
import type { InquiryStatus } from "@prisma/client";
import { STATUS_TO_API } from "@/lib/rules/inquiries";
import { InquiriesTriage } from "./_components/InquiriesTriage";

// Auth-gated and reads live triage state — must never be statically
// prerendered (CI's build job has no DATABASE_URL, and baked-in HTML would
// hide real-time status changes anyway — same fix as /admin/systems).
export const dynamic = "force-dynamic";

const ALL_FILTER = { key: "all", label: "All", dbValue: null as InquiryStatus | null };

const STATUS_FILTERS: { key: string; label: string; dbValue: InquiryStatus | null }[] = [
  ALL_FILTER,
  { key: "new", label: "New", dbValue: "NEW" },
  { key: "reviewed", label: "Reviewed", dbValue: "REVIEWED" },
  { key: "responded", label: "Responded", dbValue: "RESPONDED" },
  { key: "closed", label: "Closed", dbValue: "CLOSED" },
];

export default async function AdminInquiriesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; inquiryType?: string }>;
}) {
  const params = await searchParams;
  const activeStatusFilter = STATUS_FILTERS.find((f) => f.key === params.status) ?? ALL_FILTER;

  const [inquiries, types] = await Promise.all([
    db.inquiry.findMany({
      where: {
        ...(activeStatusFilter.dbValue && { status: activeStatusFilter.dbValue }),
        ...(params.inquiryType && { inquiryType: { key: params.inquiryType } }),
      },
      include: { inquiryType: true },
      orderBy: [{ status: "asc" }, { createdAt: "asc" }],
    }),
    db.inquiryType.findMany({ where: { active: true }, orderBy: { label: "asc" } }),
  ]);

  const rows = inquiries.map((inquiry) => ({
    id: inquiry.id,
    status: STATUS_TO_API[inquiry.status],
    name: inquiry.name,
    email: inquiry.email,
    message: inquiry.message,
    inquiryTypeLabel: inquiry.inquiryType.label,
    submittedAt: inquiry.createdAt.toISOString(),
  }));

  function typeFilterHref(typeKey: string | null) {
    const qs = new URLSearchParams();
    if (activeStatusFilter.key !== "all") qs.set("status", activeStatusFilter.key);
    if (typeKey) qs.set("inquiryType", typeKey);
    const query = qs.toString();
    return query ? `/admin/inquiries?${query}` : "/admin/inquiries";
  }

  return (
    <section className="px-6 py-12 max-w-5xl mx-auto">
      <h1 className="font-sans font-semibold text-2xl text-ink mb-6">Inquiries</h1>

      <div className="flex flex-wrap gap-x-6 gap-y-3 mb-8">
        <div className="flex gap-2 font-mono text-xs">
          {STATUS_FILTERS.map((f) => (
            <Link
              key={f.key}
              href={f.key === "all" ? "/admin/inquiries" : `/admin/inquiries?status=${f.key}`}
              className={`px-2 py-1 border ${
                f.key === activeStatusFilter.key
                  ? "border-accent text-accent"
                  : "border-slate/30 text-slate hover:border-slate"
              }`}
            >
              {f.label}
            </Link>
          ))}
        </div>

        <div className="flex flex-wrap gap-2 font-mono text-xs">
          <Link
            href={typeFilterHref(null)}
            className={`px-2 py-1 border ${
              !params.inquiryType ? "border-accent text-accent" : "border-slate/30 text-slate hover:border-slate"
            }`}
          >
            All types
          </Link>
          {types.map((t) => (
            <Link
              key={t.id}
              href={typeFilterHref(t.key)}
              className={`px-2 py-1 border ${
                params.inquiryType === t.key
                  ? "border-accent text-accent"
                  : "border-slate/30 text-slate hover:border-slate"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>

      <InquiriesTriage inquiries={rows} />
    </section>
  );
}
