// lib/queries/header.ts
// The header's Systems preview (docs/improvements/HOME-HERO-PLAN.md §17): the
// owner's featured systems — the same curation the home page uses (featured
// first, in his order; the flagships when he has featured none) — with each
// one's live status, and how many systems are published in all. Public views
// only (PublicSystem), so a private or masked system shows exactly as it does
// everywhere else. Nothing is typed in: the count of systems shown is the
// setting header.systemsPreview.count.

import { dbPublic as db } from "@/lib/db";

export interface HeaderSystem {
  slug: string;
  name: string;
  /** The status as its lookup row labels it, and the colour token that row names (EXT-1). */
  statusLabel: string;
  statusColorToken: string;
  /** Where it lives: "<organisation> · <domain>" — whichever parts exist. */
  meta: string;
}

export interface HeaderSystems {
  systems: HeaderSystem[];
  /** Every published system — for the "all systems" link. */
  total: number;
}

interface Row {
  slug: string;
  name: string;
  status: string;
  statusColorToken: string;
  organization: string;
  domain: string | null;
}

/** Shape the rows: at most `limit`, each with its own meta line. Pure, so the rule is testable. */
export function shapeHeaderSystems(rows: Row[], total: number, limit: number): HeaderSystems {
  if (limit <= 0) return { systems: [], total };
  return {
    total,
    systems: rows.slice(0, limit).map((r) => ({
      slug: r.slug,
      name: r.name,
      statusLabel: r.status,
      statusColorToken: r.statusColorToken,
      meta: [r.organization, r.domain].filter(Boolean).join(" · "),
    })),
  };
}

export async function getHeaderSystems(limit: number): Promise<HeaderSystems> {
  if (limit <= 0) return { systems: [], total: 0 };
  const select = { slug: true, name: true, status: true, statusColorToken: true, organization: true, domain: true } as const;
  const [curated, total] = await Promise.all([
    db.publicSystem.findMany({ where: { featuredOnHome: true }, orderBy: [{ homeOrder: "asc" }, { sortOrder: "asc" }], take: limit, select }),
    db.publicSystem.count(),
  ]);
  const rows = curated.length
    ? curated
    : await db.publicSystem.findMany({ orderBy: [{ isFlagship: "desc" }, { sortOrder: "asc" }], take: limit, select });
  return shapeHeaderSystems(rows, total, limit);
}
