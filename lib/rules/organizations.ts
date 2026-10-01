// lib/rules/organizations.ts
// Admin serializer for organizations (#82).

import type { Prisma } from "@prisma/client";

export const organizationWithCount = { include: { kind: true, _count: { select: { systems: true } } } } as const;

/** { kindId } for a kind key (F5c): undefined leaves it unchanged, null clears it, "invalid" for an unknown or deprecated key. */
export async function organizationKindData(tx: Prisma.TransactionClient, kind: string | null | undefined) {
  if (kind === undefined) return {};
  if (kind === null) return { kindId: null };
  const row = await tx.organizationKind.findFirst({ where: { key: kind, active: true } });
  return row ? { kindId: row.id } : ("invalid" as const);
}

export function toAdminOrganization(o: Prisma.OrganizationGetPayload<typeof organizationWithCount>) {
  return {
    id: o.id,
    name: o.name,
    slug: o.slug,
    role: o.role,
    isClient: o.isClient,
    githubLogins: o.githubLogins,
    kind: o.kind?.key ?? null,
    systemCount: o._count.systems,
  };
}
