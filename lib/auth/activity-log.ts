// lib/auth/activity-log.ts
// BR-3.4 — the one write path every admin mutation and every login attempt
// (success or failure) calls through. Not opt-in per route handler: every
// route that mutates state or handles auth calls this directly.

import { db } from "@/lib/db";

export interface LogActivityInput {
  adminUserId: string;
  action: string; // e.g. "auth.login" | "auth.login_failed" | "system.update"
  entityType?: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
}

export async function logActivity(input: LogActivityInput): Promise<void> {
  await db.activityLog.create({
    data: {
      adminUserId: input.adminUserId,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      before: input.before === undefined ? undefined : (input.before as object),
      after: input.after === undefined ? undefined : (input.after as object),
    },
  });
}
