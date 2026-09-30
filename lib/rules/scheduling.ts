// lib/rules/scheduling.ts
// Scheduled publishing (#86, BR-1.13). A publish time is part of publishing:
// the content is set to published with a future `publishAt`, so every publish
// gate runs when the schedule is set. The public views decide visibility with
// is_live() — the item appears exactly at its time, with no job to run. The
// database refuses a publish time on unpublished content and drops it when
// content stops being published.

/** Prisma data for an optional `publishAt` field: omitted = unchanged, null = clear. */
export function publishAtData(value: string | null | undefined): { publishAt?: Date | null } {
  if (value === undefined) return {};
  return { publishAt: value === null ? null : new Date(value) };
}

/** The admin wire shape: the ISO time, or null (live as soon as published). */
export function publishAtWire(publishAt: Date | null): string | null {
  return publishAt ? publishAt.toISOString() : null;
}
