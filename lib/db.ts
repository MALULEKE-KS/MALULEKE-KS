// lib/db.ts
// Prisma clients (F1.8, least privilege). Two, one per database role:
//
//   db        the application runtime (platform_runtime): reads and writes
//             rows, can't change the schema, switch off a trigger, truncate,
//             or rewrite history. DATABASE_URL_RUNTIME.
//   dbPublic  public pages (platform_public): SELECT on the masked public
//             views and public lookups only. Every public read uses it, so a
//             bug in a public page can't reach an inquiry, an admin row or an
//             unpublished system — the database refuses. DATABASE_URL_PUBLIC.
//
// Migrations run as the owner, over DATABASE_URL_UNPOOLED, during the build.
// When a role URL isn't set (local dev, a fresh environment) the client falls
// back to DATABASE_URL, so nothing breaks before the roles exist
// (docs/DEPLOYMENT.md, "Database roles").
//
// Next.js hot-reloads modules in dev, which would otherwise create new
// clients (and connection pools) on every edit — they're kept on globalThis.

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient; prismaPublic?: PrismaClient };

function client(url: string | undefined): PrismaClient {
  return url ? new PrismaClient({ datasourceUrl: url }) : new PrismaClient();
}

export const db = globalForPrisma.prisma ?? client(process.env.DATABASE_URL_RUNTIME);

export const dbPublic =
  globalForPrisma.prismaPublic ?? (process.env.DATABASE_URL_PUBLIC ? client(process.env.DATABASE_URL_PUBLIC) : db);

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
  globalForPrisma.prismaPublic = dbPublic;
}
