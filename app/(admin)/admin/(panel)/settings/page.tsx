// app/(admin)/admin/(panel)/settings/page.tsx
// The platform's tunables as data (#105): platform settings (limits,
// windows, retention — #67), lookup values for every EXT-1 type (add,
// relabel, soft-deprecate only — BR-8.2), feature flags (one at a time —
// BR-4.4) and visitor lenses.
// See docs/PAGE-SPECIFICATIONS.md ("/admin/settings").

import { Settings } from "lucide-react";
import { AdminPageHeader } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { listLookupValues, LOOKUP_TYPES } from "@/lib/rules/lookups";
import { listSettings } from "@/lib/settings";
import { SettingsManager } from "./_components/SettingsManager";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const [platform, flags, lenses, lookupLists] = await Promise.all([
    listSettings(),
    db.flag.findMany({ orderBy: { key: "asc" } }),
    db.visitorLens.findMany({ orderBy: [{ sortOrder: "asc" }, { label: "asc" }] }),
    Promise.all(LOOKUP_TYPES.map((type) => listLookupValues(type, true))),
  ]);

  return (
    <>
      <AdminPageHeader
        icon={Settings}
        title="Settings"
        description="Every number the platform runs on, the lookup values behind its dropdowns, and its feature switches — data, not code."
      />
      <SettingsManager
        platform={platform}
        flags={flags.map((f) => ({ id: f.id, key: f.key, enabled: f.enabled, notes: f.notes }))}
        lenses={lenses.map((l) => ({ id: l.id, key: l.key, label: l.label, aiFramingPrompt: l.aiFramingPrompt, sortOrder: l.sortOrder, priorityContent: l.priorityContent as Record<string, unknown> }))}
        lookups={Object.fromEntries(LOOKUP_TYPES.map((type, i) => [type, lookupLists[i] ?? []]))}
      />
    </>
  );
}
