// lib/auth/activity-log.ts
// BR-3.4 — the one write path for the audit trail: every admin mutation and
// every login attempt, success or failure. The table is append-only in the
// database itself (F1.3, trigger ActivityLog_append_only).
//
// Actors (F1.3): ADMIN (an authenticated admin), ANONYMOUS (e.g. a failed
// login for an email that isn't an admin — BR-3.4 requires those too), SYSTEM
// (jobs and operator scripts). Request context is recorded only as keyed
// hashes: comparable across entries ("same IP as last time?"), never readable.

import type { ActorType } from "@prisma/client";
import { db } from "@/lib/db";
import { clientIp } from "@/lib/security/client-ip";
import { keyedHash } from "@/lib/security/keyed-hash";

export interface LogActivityInput {
  action: string; // e.g. "auth.login" | "auth.login_failed" | "system.update"
  /** The authenticated admin who acted. Omit for ANONYMOUS/SYSTEM actors. */
  adminUserId?: string;
  /** Defaults to ADMIN when adminUserId is given, otherwise ANONYMOUS. */
  actorType?: ActorType;
  entityType?: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
  /** What an anonymous actor tried (e.g. the login email) — stored hashed. */
  subject?: string;
  /** The request, to record hashed IP and user-agent context. */
  request?: Request;
}

export async function logActivity(input: LogActivityInput): Promise<void> {
  const actorType: ActorType = input.actorType ?? (input.adminUserId ? "ADMIN" : "ANONYMOUS");
  const userAgent = input.request?.headers.get("user-agent");

  await db.activityLog.create({
    data: {
      actorType,
      adminUserId: actorType === "ADMIN" ? input.adminUserId : null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      before: input.before === undefined ? undefined : (input.before as object),
      after: input.after === undefined ? undefined : (input.after as object),
      subjectHash: input.subject ? keyedHash("subject", input.subject.toLowerCase()) : null,
      ipHash: input.request ? keyedHash("ip", clientIp(input.request)) : null,
      userAgentHash: userAgent ? keyedHash("user-agent", userAgent) : null,
    },
  });
}
