// lib/rules/timeline.ts
// Serializer shared by the public /journey feed and the admin /admin/timeline
// CRUD — no masking difference between the two, unlike System, since a
// Timeline entry carries no client-confidentiality dimension.

import { Prisma } from "@prisma/client";

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
  };
}
