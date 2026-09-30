// lib/rules/slugs.ts
// Slug history (#87, BR-1.14). The database records every slug a system gives
// up and redirects it permanently; an old slug stays reserved for the system
// that used it. These helpers let callers choose a slug the database will
// accept (the admin API and the GitHub sync); the public redirect lookup is
// publicSlugRedirect() in lib/queries/systems.ts.

import type { Prisma } from "@prisma/client";

type SlugReader = { system: Prisma.SystemDelegate; systemSlugHistory: Prisma.SystemSlugHistoryDelegate };

/** Free for `systemId`: nobody else's current slug and nobody else's old one. */
export async function isSlugAvailable(client: SlugReader, slug: string, systemId: string | null): Promise<boolean> {
  const [current, reserved] = await Promise.all([
    client.system.findUnique({ where: { slug }, select: { id: true } }),
    client.systemSlugHistory.findUnique({ where: { slug }, select: { systemId: true } }),
  ]);
  return (!current || current.id === systemId) && (!reserved || reserved.systemId === systemId);
}
