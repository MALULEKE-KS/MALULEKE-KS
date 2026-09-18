// lib/rules/lookups.ts
// BR-8.1 – BR-8.3 as enforceable code. Owns: the type->model mapping every
// /lookups/{type} route needs, soft-deprecation instead of hard-delete for
// in-use values, and the referencing-row check before any hard delete.

import { Prisma } from "@prisma/client";
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

// One Prisma delegate per type, each sharing the same {id, key, label,
// active} shape (prisma/schema.prisma) — this is the literal EXT-1
// mechanism: a new lookup value is a row via one of these delegates, never
// a code change to this list itself unless a genuinely new dimension
// (a new *type*, not a new *value*) is added.
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

export interface LookupValueRow {
  id: string;
  key: string;
  label: string;
  active: boolean;
}

export async function listLookupValues(
  type: LookupType,
  includeInactive: boolean
): Promise<LookupValueRow[]> {
  // Each delegate's findMany has a distinct, mutually-incompatible generated
  // type (TS can't call through a union of them directly), but all five
  // share the same {id,key,label,active} shape at runtime (they're all
  // EXT-1 lookup tables) — narrowed to that one common, explicit signature
  // here, at the single narrowest point, rather than letting `any` leak
  // into every caller of listLookupValues.
  const delegate = delegateFor(type) as unknown as {
    findMany: (args: { where: object; orderBy: object }) => Promise<LookupValueRow[]>;
  };
  return delegate.findMany({
    where: includeInactive ? {} : { active: true },
    orderBy: { label: "asc" },
  });
}

// BR-8.1 — the one place a new lookup value gets created, for any type.
export async function createLookupValue(type: LookupType, key: string, label: string): Promise<LookupValueRow> {
  const delegate = delegateFor(type) as unknown as {
    create: (args: { data: { key: string; label: string } }) => Promise<LookupValueRow>;
  };
  return delegate.create({ data: { key, label } });
}

// BR-8.2 — marks a value inactive without deleting it, regardless of
// whether it's currently referenced. Hard delete is a separate, unexposed
// operation reserved for never-used values (not implemented here — no
// route in the contract exposes it).
export async function deprecateLookupValue(type: LookupType, id: string): Promise<LookupValueRow | null> {
  const delegate = delegateFor(type) as unknown as {
    update: (args: { where: { id: string }; data: { active: boolean } }) => Promise<LookupValueRow>;
  };
  try {
    return await delegate.update({ where: { id }, data: { active: false } });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2025") {
      return null;
    }
    throw err;
  }
}
