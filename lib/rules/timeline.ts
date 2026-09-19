// lib/rules/timeline.ts
// Serializer shared by the public /journey feed and the admin /admin/timeline
// CRUD — no masking difference between the two, unlike System, since a
// Timeline entry carries no client-confidentiality dimension. What differs is
// WHICH entries: public reads filter on PUBLISHED_TIMELINE_WHERE, so a draft
// (e.g. one the database auto-drafted when a system shipped, #70) is never
// public until the admin approves it.

import { Prisma, ContentStatus } from "@prisma/client";

// BR-1.12 — an entry about a system is public only while that system is
// published too, so a journey entry can never reveal an unpublished system
// (the same principle as BR-6.2 for testimonials).
export const PUBLISHED_TIMELINE_WHERE = {
  contentStatus: ContentStatus.PUBLISHED,
  OR: [{ systemId: null }, { system: { contentStatus: ContentStatus.PUBLISHED } }],
} satisfies Prisma.TimelineWhereInput;

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

export function toTimelineEntry(entry: TimelineWithMilestoneType) {
  return {
    id: entry.id,
    milestoneType: entry.milestoneType.key,
    title: entry.title,
    description: entry.description,
    date: entry.date.toISOString().slice(0, 10),
    tags: entry.tags,
    contentStatus: entry.contentStatus.toLowerCase() as "draft" | "published" | "archived",
    autoDrafted: entry.autoDrafted,
    systemId: entry.systemId,
  };
}
