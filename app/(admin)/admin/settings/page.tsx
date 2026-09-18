// app/(admin)/admin/settings/page.tsx
// Feature flags (one-at-a-time toggle, no bulk-enable — BR-4.4), lookup
// table management (add/soft-deprecate only, no hard-delete UI — BR-8.2),
// visitor lens configuration.
// See docs/PAGE-SPECIFICATIONS.md ("/admin/settings").

import { db } from "@/lib/db";
import { LOOKUP_TYPES } from "@/lib/rules/lookups";
import { SettingsManager } from "./_components/SettingsManager";

// Auth-gated and reads live config — must never be statically prerendered
// (same reasoning as every other DB-backed admin page).
export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const [flags, lenses, ...lookupResults] = await Promise.all([
    db.flag.findMany({ orderBy: { key: "asc" } }),
    db.visitorLens.findMany({ orderBy: { label: "asc" } }),
    db.status.findMany({ orderBy: { label: "asc" } }),
    db.domain.findMany({ orderBy: { label: "asc" } }),
    db.inquiryType.findMany({ orderBy: { label: "asc" } }),
    db.milestoneType.findMany({ orderBy: { label: "asc" } }),
    db.skillCategory.findMany({ orderBy: { label: "asc" } }),
  ]);

  const lookups: Record<string, { id: string; key: string; label: string; active: boolean }[]> =
    Object.fromEntries(
      LOOKUP_TYPES.map((type, i) => [
        type,
        (lookupResults[i] ?? []).map((v) => ({ id: v.id, key: v.key, label: v.label, active: v.active })),
      ])
    );

  return (
    <section className="px-6 py-12 max-w-4xl mx-auto">
      <h1 className="font-sans font-semibold text-2xl text-ink mb-6">Settings</h1>
      <SettingsManager
        flags={flags}
        lenses={lenses.map((l) => ({ ...l, priorityContent: l.priorityContent as Record<string, unknown> }))}
        lookups={lookups}
      />
    </section>
  );
}
