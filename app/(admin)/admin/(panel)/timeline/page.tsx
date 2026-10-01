// app/(admin)/admin/(panel)/timeline/page.tsx
// Standard CRUD for Timeline entries only. MilestoneType select pulls live
// from its lookup table. Entries may be hard-deleted (no publishing history).
// See docs/PAGE-SPECIFICATIONS.md ("/admin/timeline").

import { BookOpen } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { timelineWithMilestoneType, toTimelineEntry } from "@/lib/rules/timeline";
import { TimelineManager } from "./_components/TimelineManager";

// Auth-gated and reads live content — must never be statically prerendered
// (same reasoning as every other DB-backed admin page).
export const dynamic = "force-dynamic";

export default async function AdminTimelinePage() {
  const [entries, milestoneTypes] = await Promise.all([
    db.timeline.findMany({ ...timelineWithMilestoneType, orderBy: { date: "desc" } }),
    db.milestoneType.findMany({ where: { active: true }, orderBy: { label: "asc" } }),
  ]);

  return (
    <>
      <AdminPageHeader icon={BookOpen} title="Journey" description="The milestones on /journey. Entries drafted by the GitHub sync wait here for your approval." />
      <TimelineManager
        now={new Date().getTime()}
        entries={entries.map(toTimelineEntry)}
        milestoneTypes={milestoneTypes.map((t) => ({ id: t.id, key: t.key, label: t.label }))}
      />
    </>
  );
}
