// lib/queries/admin-shell.ts
// What the admin's shell needs on every page (D-057): the counts of what waits
// on the owner (the sidebar and the phone dock show them beside their page —
// the same queries the overview's attention list runs, so the two agree) and
// the index the search (⌘K) and the page bar's breadcrumb read: every system,
// the latest inquiries, every setting and every page-content block. Read by
// the panel layout, which persists across navigation; editors' router.refresh()
// re-reads it, so a count drops the moment its work is done.

import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";
import { SETTINGS, SETTING_KEYS } from "@/lib/settings/registry";
import { CONTENT_BLOCKS, type ContentKey } from "@/lib/content/blocks";
import { STATUS_LABEL } from "@/lib/rules/inquiries";
import type { AdminCountKey } from "@/lib/admin/nav";

/** How many recent inquiries the search knows by name and reference. */
const SEARCH_INQUIRIES = 200;

export interface AdminShellData {
  counts: Record<AdminCountKey, number>;
  systems: { id: string; name: string; slug: string; published: boolean; organization: string }[];
  inquiries: { id: string; reference: string; name: string | null; status: string }[];
  settings: { key: string; description: string }[];
  blocks: { key: string; title: string }[];
  /** The zone every admin date is written in (setting `site.timeZone`). */
  timeZone: string;
}

export async function getAdminShell(): Promise<AdminShellData> {
  const [inquiries, curation, journey, numbers, stale, systems, recent, timeZone] = await Promise.all([
    db.inquiry.count({ where: { status: "NEW" } }),
    db.system.count({ where: { needsCuration: true } }),
    db.timeline.count({ where: { autoDrafted: true, contentStatus: "DRAFT" } }),
    db.metricSnapshot.count({ where: { status: "PROPOSED" } }),
    getSetting("content.freshnessDays").then((days) => db.$queryRaw<{ n: bigint }[]>`SELECT count(*)::bigint AS n FROM stale_content(${days}::int)`),
    db.system.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true, slug: true, contentStatus: true, organization: { select: { name: true } } } }),
    db.inquiry.findMany({ orderBy: { createdAt: "desc" }, take: SEARCH_INQUIRIES, select: { id: true, reference: true, name: true, status: true, anonymizedAt: true } }),
    getSetting("site.timeZone"),
  ]);
  return {
    counts: { inquiries, curation, journey, numbers, freshness: Number(stale[0]?.n ?? 0) },
    systems: systems.map((s) => ({ id: s.id, name: s.name, slug: s.slug, published: s.contentStatus === "PUBLISHED", organization: s.organization.name })),
    // An anonymised inquiry is found by its reference only (BR-5.2).
    inquiries: recent.map((i) => ({ id: i.id, reference: i.reference, name: i.anonymizedAt ? null : i.name, status: STATUS_LABEL[i.status] })),
    settings: SETTING_KEYS.map((key) => ({ key, description: SETTINGS[key].description })),
    blocks: (Object.keys(CONTENT_BLOCKS) as ContentKey[]).map((key) => ({ key, title: CONTENT_BLOCKS[key].title })),
    timeZone,
  };
}
