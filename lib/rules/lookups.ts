// lib/rules/lookups.ts
// BR-8.1 – BR-8.3 as enforceable code. Owns: the type->model mapping every
// /lookups/{type} route needs, create/update (status also carries a pipeline
// stage and a curated colour — #52), soft-deprecation instead of hard-delete,
// and the BR-8.3 answer when a deprecated key is re-created.

import { Prisma, type PipelineStage } from "@prisma/client";
import { db } from "@/lib/db";

export const LOOKUP_TYPES = [
  "status",
  "domain",
  "inquiry-type",
  "milestone-type",
  "skill-category",
] as const;

export type LookupType = (typeof LOOKUP_TYPES)[number];

export function isLookupType(value: string): value is LookupType {
  return (LOOKUP_TYPES as readonly string[]).includes(value);
}

// One Prisma delegate per type, each sharing the {id, key, label, active}
// shape — the literal EXT-1 mechanism: a new value is a row, never a code change.
function delegateFor(type: LookupType) {
  switch (type) {
    case "status":
      return db.status;
    case "domain":
      return db.domain;
    case "inquiry-type":
      return db.inquiryType;
    case "milestone-type":
      return db.milestoneType;
    case "skill-category":
      return db.skillCategory;
  }
}

// Each delegate's methods have distinct generated types that TS can't call
// through a union; all five share this runtime shape, narrowed here once.
type Delegate = {
  findMany: (args: object) => Promise<LookupRow[]>;
  findUnique: (args: object) => Promise<LookupRow | null>;
  create: (args: object) => Promise<LookupRow>;
  update: (args: object) => Promise<LookupRow>;
};
const delegate = (type: LookupType) => delegateFor(type) as unknown as Delegate;

interface LookupRow {
  id: string;
  key: string;
  label: string;
  active: boolean;
  stage?: PipelineStage;
  colorToken?: string;
}

export interface LookupValueView {
  id: string;
  key: string;
  label: string;
  active: boolean;
  stage?: "shipped" | "building" | "queued";
  colorToken?: string;
}

/** The public wire shape — status rows also expose stage and colour. */
export function toLookupView(type: LookupType, row: LookupRow): LookupValueView {
  const base = { id: row.id, key: row.key, label: row.label, active: row.active };
  if (type !== "status") return base;
  return {
    ...base,
    stage: row.stage?.toLowerCase() as LookupValueView["stage"],
    colorToken: row.colorToken,
  };
}

export async function listLookupValues(type: LookupType, includeInactive: boolean): Promise<LookupValueView[]> {
  const rows = await delegate(type).findMany({
    where: includeInactive ? {} : { active: true },
    orderBy: { label: "asc" },
  });
  return rows.map((row) => toLookupView(type, row));
}

export interface StatusExtras {
  stage?: "shipped" | "building" | "queued";
  colorToken?: string;
}

const toStage = (stage?: StatusExtras["stage"]) => stage?.toUpperCase() as PipelineStage | undefined;

export type CreateLookupResult =
  | { ok: true; value: LookupValueView }
  | { ok: false; code: "LOOKUP_KEY_DEPRECATED" | "LOOKUP_KEY_EXISTS"; existingId: string };

// BR-8.1 — the one place a new lookup value gets created, for any type.
// BR-8.3 — re-creating a key that exists answers with an actionable code:
// reactivate a deprecated value rather than duplicating it.
export async function createLookupValue(
  type: LookupType,
  key: string,
  label: string,
  extras: StatusExtras = {},
): Promise<CreateLookupResult> {
  const data =
    type === "status"
      ? {
          key,
          label,
          ...(extras.stage && { stage: toStage(extras.stage) }),
          ...(extras.colorToken && { colorToken: extras.colorToken }),
        }
      : { key, label };

  try {
    const row = await delegate(type).create({ data });
    return { ok: true, value: toLookupView(type, row) };
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      const existing = await delegate(type).findUnique({ where: { key } });
      if (existing) {
        return {
          ok: false,
          code: existing.active ? "LOOKUP_KEY_EXISTS" : "LOOKUP_KEY_DEPRECATED",
          existingId: existing.id,
        };
      }
    }
    throw err;
  }
}

// Edit an existing value. The key is immutable (BR-8.3 keeps keys stable).
// Status also accepts a new stage — moving every system in that status between
// the shipped / building / queued counts with no code change (EXT-1).
export async function updateLookupValue(
  type: LookupType,
  id: string,
  changes: { label?: string } & StatusExtras,
): Promise<{ before: LookupValueView; after: LookupValueView } | null> {
  const existing = await delegate(type).findUnique({ where: { id } });
  if (!existing) return null;
  const data =
    type === "status"
      ? {
          ...(changes.label && { label: changes.label }),
          ...(changes.stage && { stage: toStage(changes.stage) }),
          ...(changes.colorToken && { colorToken: changes.colorToken }),
        }
      : { ...(changes.label && { label: changes.label }) };
  const row = await delegate(type).update({ where: { id }, data });
  return { before: toLookupView(type, existing), after: toLookupView(type, row) };
}

// BR-8.2 — marks a value inactive without deleting it, regardless of
// whether it's currently referenced. Hard delete is a separate, unexposed
// operation reserved for never-used values (no route exposes it).
export async function deprecateLookupValue(type: LookupType, id: string): Promise<LookupValueView | null> {
  try {
    const row = await delegate(type).update({ where: { id }, data: { active: false } });
    return toLookupView(type, row);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return null;
    }
    throw err;
  }
}
