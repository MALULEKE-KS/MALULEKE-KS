// lib/auth/activity-log.ts
// BR-3.4 — the one write path every admin mutation and every login attempt
// (success or failure) calls through. Invoked at the middleware layer, never
// opted into per route handler.
// TODO: implement — see docs/BUSINESS-RULES-v1.md §3, prisma/schema.prisma ActivityLog.

export {};
