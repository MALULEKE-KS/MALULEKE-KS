// app/(admin)/admin/activity-log/page.tsx
// Read-only ActivityLogTable — the audit ledger the rest of the platform's
// discipline depends on, made visible to the one person it's for.
// TODO: implement — see docs/PAGE-SPECIFICATIONS.md ("/admin/activity-log").

import { ActivityLogTable } from "@/components/admin/ActivityLogTable";

export default function AdminActivityLogPage() {
  return <ActivityLogTable />;
}
