// lib/db.ts
// Prisma client singleton. Next.js hot-reloads modules in dev, which would
// otherwise instantiate a new PrismaClient (and a new connection pool) on
// every edit — stashing it on `globalThis` in development survives reloads.
// Production gets a fresh, single instance per server process as normal.

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
