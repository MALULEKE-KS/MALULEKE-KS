// lib/rules/timeline.ts
// Serializers for the admin /admin/timeline CRUD and the public /journey
// feed. Public reads use the PublicTimeline view (F1.7), which already
// applies BR-1.12: published entries only, and only while their system (if
// any) is published — so an auto-drafted entry (#70) is never public until
// the admin approves it.

import { Prisma, ContentStatus, type PublicTimeline } from "@prisma/client";
import { publishAtWire } from "@/lib/rules/scheduling";

export const CONTENT_STATUS_FROM_WIRE = {
  draft: ContentStatus.DRAFT,
  published: ContentStatus.PUBLISHED,
  archived: ContentStatus.ARCHIVED,
} as const;

const timelineWithMilestoneType = Prisma.validator<Prisma.TimelineDefaultArgs>()({
  include: { milestoneType: true },
});
export type TimelineWithMilestoneType = Prisma.TimelineGetPayload<typeof timelineWithMilestoneType>;
export { timelineWithMilestoneType };

/** The public wire shape (openapi TimelineEntry) from a PublicTimeline view row. */
export type DatePrecision = "day" | "month" | "year";

/** A milestone's date at the precision it's known — "2 Oct 2026", "Sep 2026", "2022"; never an invented day. */
export function formatMilestoneDate(date: Date, precision: string, style: "short" | "long" = "long"): string {
  if (precision === "year") return String(date.getUTCFullYear());
  if (precision === "month") return date.toLocaleDateString("en-GB", { month: style === "short" ? "short" : "long", year: "numeric", timeZone: "UTC" });
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", ...(style === "long" && { year: "numeric" }), timeZone: "UTC" });
}

export function toPublicTimelineEntry(row: PublicTimeline) {
  return {
    id: row.id,
    milestoneType: row.milestoneType,
    title: row.title,
    description: row.description,
    date: row.date.toISOString().slice(0, 10),
    datePrecision: row.datePrecision as DatePrecision,
    tags: row.tags,
    contentStatus: "published" as const,
    autoDrafted: row.autoDrafted,
    systemId: row.systemId,
  };
}

export function toTimelineEntry(entry: TimelineWithMilestoneType) {
  return {
    id: entry.id,
    milestoneType: entry.milestoneType.key,
    title: entry.title,
    description: entry.description,
    date: entry.date.toISOString().slice(0, 10),
    datePrecision: entry.datePrecision as DatePrecision,
    tags: entry.tags,
    contentStatus: entry.contentStatus.toLowerCase() as "draft" | "published" | "archived",
    autoDrafted: entry.autoDrafted,
    systemId: entry.systemId,
    publishAt: publishAtWire(entry.publishAt),
  };
}
