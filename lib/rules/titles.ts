// lib/rules/titles.ts
// The owner's titles and qualifications (F5c, D13): serializer and input
// resolution for the admin API. Kinds are a lookup (TitleKind, EXT-1).

import type { Prisma } from "@prisma/client";

export const titleWithKind = { include: { kind: true } } as const;
type TitleWithKind = Prisma.ProfileTitleGetPayload<typeof titleWithKind>;

const dateOnly = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null);

export function toAdminTitle(t: TitleWithKind, today = new Date()) {
  const todayStr = today.toISOString().slice(0, 10);
  const starts = dateOnly(t.startsOn);
  const ends = dateOnly(t.endsOn);
  return {
    id: t.id,
    kind: t.kind.key,
    kindLabel: t.kind.label,
    label: t.label,
    detail: t.detail,
    educationId: t.educationId,
    sortOrder: t.sortOrder,
    startsOn: starts,
    endsOn: ends,
    // Mirrors PublicProfileTitle: is it on the site now?
    current: t.kind.active && (!starts || starts <= todayStr) && (!ends || ends >= todayStr),
  };
}

/** Database shape for a title write; null when the kind key isn't an active kind. */
export async function titleData(
  tx: Prisma.TransactionClient,
  input: { kind: string; label: string; detail?: string | null; educationId?: string | null; sortOrder: number; startsOn?: string | null; endsOn?: string | null },
) {
  const kind = await tx.titleKind.findFirst({ where: { key: input.kind, active: true } });
  if (!kind) return null;
  return {
    kindId: kind.id,
    label: input.label,
    detail: input.detail ?? null,
    educationId: input.educationId ?? null,
    sortOrder: input.sortOrder,
    startsOn: input.startsOn ? new Date(input.startsOn) : null,
    endsOn: input.endsOn ? new Date(input.endsOn) : null,
  };
}
