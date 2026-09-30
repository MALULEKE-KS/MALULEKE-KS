// lib/rules/organizations.ts
// Admin serializer for organizations (#82).

import type { Prisma } from "@prisma/client";

export const organizationWithCount = { include: { _count: { select: { systems: true } } } } as const;

export function toAdminOrganization(o: Prisma.OrganizationGetPayload<typeof organizationWithCount>) {
  return {
    id: o.id,
    name: o.name,
    slug: o.slug,
    role: o.role,
    isClient: o.isClient,
    githubLogins: o.githubLogins,
    systemCount: o._count.systems,
  };
}
