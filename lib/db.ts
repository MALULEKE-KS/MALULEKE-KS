// lib/db.ts
// Prisma client singleton — prevents exhausting DB connections via hot-reload
// re-instantiation in dev. Every other lib/app file imports { db } from here,
// never `new PrismaClient()` directly.
// TODO: implement (standard Next.js Prisma singleton pattern).

export {};
