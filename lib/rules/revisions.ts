// lib/rules/revisions.ts
// Content revisions (#88, BR-1.15). The database writes a version of a
// system's case study or description on every change; this reads them and
// restores one by writing its text back — which the database records as a new
// version, so history only ever grows.

import type { SystemContentRevision } from "@prisma/client";
import type { Tx } from "@/lib/audit";

export const REVISION_FIELDS = ["caseStudyBody", "description"] as const;
export type RevisionField = (typeof REVISION_FIELDS)[number];

const MAX_LISTED = 200;

export function toRevision(r: SystemContentRevision, currentBody: string | null) {
  return {
    id: r.id,
    field: r.field as RevisionField,
    body: r.body,
    actorType: r.actorType,
    adminUserId: r.adminUserId,
    backfilled: r.backfilled,
    createdAt: r.createdAt.toISOString(),
    current: false as boolean,
    matchesCurrent: r.body === currentBody,
  };
}

/** Newest first; the newest one is the current text. Null if the system doesn't exist. */
export async function listRevisions(client: Pick<Tx, "system" | "systemContentRevision">, systemId: string, field: RevisionField) {
  const system = await client.system.findUnique({ where: { id: systemId }, select: { caseStudyBody: true, description: true } });
  if (!system) return null;
  const rows = await client.systemContentRevision.findMany({
    where: { systemId, field },
    orderBy: { createdAt: "desc" },
    take: MAX_LISTED,
  });
  const currentBody = system[field];
  return rows.map((row, index) => ({ ...toRevision(row, currentBody), current: index === 0 }));
}

/**
 * Write an earlier version's text back (BR-1.15). Unchanged text records
 * nothing new. Null if the revision doesn't belong to this system.
 */
export async function restoreRevision(tx: Tx, systemId: string, revisionId: string) {
  const revision = await tx.systemContentRevision.findFirst({ where: { id: revisionId, systemId } });
  if (!revision) return null;
  const field = revision.field as RevisionField;

  const before = await tx.system.findUniqueOrThrow({ where: { id: systemId }, select: { caseStudyBody: true, description: true } });
  if (before[field] === revision.body) return { field, body: revision.body, changed: false };

  // description is required; its versions are never null.
  await tx.system.update({
    where: { id: systemId },
    data: field === "description" ? { description: revision.body ?? "" } : { caseStudyBody: revision.body },
  });
  return { field, body: revision.body, changed: true };
}
