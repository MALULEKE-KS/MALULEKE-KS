// lib/rules/lookups.ts
// BR-8.1 – BR-8.3 as enforceable code. Owns: the type->model mapping every
// /lookups/{type} route needs, create/update, soft-deprecation instead of
// hard-delete, and the BR-8.3 answer when an existing key is re-created.
//
// Some types carry extra fields, all data rather than code (EXT-1):
//   status             stage + curated colour (#52)
//   repo-relationship  whether the repo owner's permission gates publishing (#69, BR-1.11)
//   milestone-type     whether it's the type a first ship is auto-drafted as (#70)

import { Prisma, type PipelineStage } from "@prisma/client";
import { db, dbPublic } from "@/lib/db";

export const LOOKUP_TYPES = [
  "status",
  "domain",
  "inquiry-type",
  "milestone-type",
  "skill-category",
  "repo-relationship",
] as const;

export type LookupType = (typeof LOOKUP_TYPES)[number];

export function isLookupType(value: string): value is LookupType {
  return (LOOKUP_TYPES as readonly string[]).includes(value);
}

// One Prisma delegate per type, each sharing the {id, key, label, active}
// shape — the literal EXT-1 mechanism: a new value is a row, never a code change.
function delegateFor(type: LookupType, client: Prisma.TransactionClient) {
  switch (type) {
    case "status":
      return client.status;
    case "domain":
      return client.domain;
    case "inquiry-type":
      return client.inquiryType;
    case "milestone-type":
      return client.milestoneType;
    case "skill-category":
      return client.skillCategory;
    case "repo-relationship":
      return client.repoRelationship;
  }
}

// Each delegate's methods have distinct generated types that TS can't call
// through a union; all share this runtime shape, narrowed here once.
type Delegate = {
  findMany: (args: object) => Promise<LookupRow[]>;
  findUnique: (args: object) => Promise<LookupRow | null>;
  create: (args: object) => Promise<LookupRow>;
  update: (args: object) => Promise<LookupRow>;
  updateMany: (args: object) => Promise<unknown>;
};
const delegate = (type: LookupType, client: Prisma.TransactionClient = db) =>
  delegateFor(type, client) as unknown as Delegate;

interface LookupRow {
  id: string;
  key: string;
  label: string;
  active: boolean;
  stage?: PipelineStage;
  colorToken?: string;
  requiresOwnerPermission?: boolean;
  autoDraftOnShip?: boolean;
}

export interface LookupValueView {
  id: string;
  key: string;
  label: string;
  active: boolean;
  stage?: "shipped" | "building" | "queued";
  colorToken?: string;
  requiresOwnerPermission?: boolean;
  autoDraftOnShip?: boolean;
}

/** The extra fields each type accepts — anything else is refused by the route. */
export interface LookupExtras {
  stage?: "shipped" | "building" | "queued";
  colorToken?: string;
  requiresOwnerPermission?: boolean;
  autoDraftOnShip?: boolean;
}

const EXTRAS_BY_TYPE: Record<LookupType, (keyof LookupExtras)[]> = {
  status: ["stage", "colorToken"],
  domain: [],
  "inquiry-type": [],
  "milestone-type": ["autoDraftOnShip"],
  "skill-category": [],
  "repo-relationship": ["requiresOwnerPermission"],
};

/** Extras supplied that this type doesn't have, e.g. a stage on a domain. */
export function unsupportedExtras(type: LookupType, extras: LookupExtras): string[] {
  return (Object.keys(extras) as (keyof LookupExtras)[]).filter(
    (k) => extras[k] !== undefined && !EXTRAS_BY_TYPE[type].includes(k),
  );
}

/** The public wire shape — each type exposes its own extras. */
export function toLookupView(type: LookupType, row: LookupRow): LookupValueView {
  const view: LookupValueView = { id: row.id, key: row.key, label: row.label, active: row.active };
  if (type === "status") {
    view.stage = row.stage?.toLowerCase() as LookupValueView["stage"];
    view.colorToken = row.colorToken;
  }
  if (type === "repo-relationship") view.requiresOwnerPermission = row.requiresOwnerPermission;
  if (type === "milestone-type") view.autoDraftOnShip = row.autoDraftOnShip;
  return view;
}

// Active values are public and read through the public role (F1.8); the
// admin's view including deprecated values uses the runtime.
export async function listLookupValues(type: LookupType, includeInactive: boolean): Promise<LookupValueView[]> {
  const rows = await delegate(type, includeInactive ? db : dbPublic).findMany({
    where: includeInactive ? {} : { active: true },
    orderBy: { label: "asc" },
  });
  return rows.map((row) => toLookupView(type, row));
}

// Only the extras this type has, in database shape.
function extrasData(type: LookupType, extras: LookupExtras) {
  const allowed = EXTRAS_BY_TYPE[type];
  return {
    ...(allowed.includes("stage") && extras.stage && { stage: extras.stage.toUpperCase() as PipelineStage }),
    ...(allowed.includes("colorToken") && extras.colorToken && { colorToken: extras.colorToken }),
    ...(allowed.includes("requiresOwnerPermission") &&
      extras.requiresOwnerPermission !== undefined && { requiresOwnerPermission: extras.requiresOwnerPermission }),
    ...(allowed.includes("autoDraftOnShip") &&
      extras.autoDraftOnShip !== undefined && { autoDraftOnShip: extras.autoDraftOnShip }),
  };
}

// At most one milestone type is the first-ship type (a partial unique index).
// Choosing a new one hands the flag over rather than failing on the index.
async function releaseAutoDraftFlag(
  tx: Prisma.TransactionClient,
  type: LookupType,
  extras: LookupExtras,
  exceptId?: string,
) {
  if (type !== "milestone-type" || extras.autoDraftOnShip !== true) return;
  await delegate(type, tx).updateMany({
    where: { autoDraftOnShip: true, ...(exceptId && { id: { not: exceptId } }) },
    data: { autoDraftOnShip: false },
  });
}

export type CreateLookupResult =
  | { ok: true; value: LookupValueView }
  | { ok: false; code: "LOOKUP_KEY_DEPRECATED" | "LOOKUP_KEY_EXISTS"; existingId: string };

// BR-8.1 — the one place a new lookup value gets created, for any type.
// BR-8.3 — re-creating a key that exists answers with an actionable code:
// reactivate a deprecated value rather than duplicating it.
// Runs inside the caller's audited transaction (F2.1), so the key is checked
// before the insert — a failed insert would abort the whole transaction.
// A concurrent create can still hit the unique key (P2002); callers map it
// with existingLookupConflict().
export async function createLookupValue(
  tx: Prisma.TransactionClient,
  type: LookupType,
  key: string,
  label: string,
  extras: LookupExtras = {},
): Promise<CreateLookupResult> {
  const existing = await delegate(type, tx).findUnique({ where: { key } });
  if (existing) return conflict(existing);
  await releaseAutoDraftFlag(tx, type, extras);
  const row = await delegate(type, tx).create({ data: { key, label, ...extrasData(type, extras) } });
  return { ok: true, value: toLookupView(type, row) };
}

function conflict(existing: LookupRow): CreateLookupResult {
  return {
    ok: false,
    code: existing.active ? "LOOKUP_KEY_EXISTS" : "LOOKUP_KEY_DEPRECATED",
    existingId: existing.id,
  };
}

/** After a unique-key race (P2002), the same BR-8.3 answer as the pre-check. */
export async function existingLookupConflict(type: LookupType, key: string): Promise<CreateLookupResult | null> {
  const existing = await delegate(type).findUnique({ where: { key } });
  return existing ? conflict(existing) : null;
}

// Edit an existing value. The key is immutable (BR-8.3 keeps keys stable).
// A status can move stage — every system in it moves between the shipped /
// building / queued counts with no code change (EXT-1). A repo relationship
// can start or stop requiring the owner's permission; the database re-checks
// every system using it (BR-1.11).
export async function updateLookupValue(
  tx: Prisma.TransactionClient,
  type: LookupType,
  id: string,
  changes: { label?: string } & LookupExtras,
): Promise<{ before: LookupValueView; after: LookupValueView } | null> {
  const existing = await delegate(type, tx).findUnique({ where: { id } });
  if (!existing) return null;
  await releaseAutoDraftFlag(tx, type, changes, id);
  const row = await delegate(type, tx).update({
    where: { id },
    data: { ...(changes.label && { label: changes.label }), ...extrasData(type, changes) },
  });
  return { before: toLookupView(type, existing), after: toLookupView(type, row) };
}

// BR-8.2 — marks a value inactive without deleting it, regardless of
// whether it's currently referenced. Hard delete is a separate, unexposed
// operation reserved for never-used values (no route exposes it).
export async function deprecateLookupValue(
  tx: Prisma.TransactionClient,
  type: LookupType,
  id: string,
): Promise<LookupValueView | null> {
  const existing = await delegate(type, tx).findUnique({ where: { id } });
  if (!existing) return null;
  const row = await delegate(type, tx).update({ where: { id }, data: { active: false } });
  return toLookupView(type, row);
}
