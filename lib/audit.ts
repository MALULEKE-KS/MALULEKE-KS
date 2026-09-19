// lib/audit.ts
// Attribution for the database's audit trail (F2.1, #80). The database logs
// every change itself (migration 20260919100000_audit_trail_triggers); this
// module only tells it who is acting, by setting transaction-local settings
// before the work runs:
//
//   app.admin_id / app.actor_type   ADMIN (with the admin) or ANONYMOUS
//   app.ip_hash / app.user_agent_hash   keyed hashes of the request (F1.5)
//
// Transaction-local (set_config(..., true)), so nothing leaks between pooled
// connections. Anything written outside withActor is still logged — as SYSTEM.

import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { clientIp } from "@/lib/security/client-ip";
import { keyedHash } from "@/lib/security/keyed-hash";

export type Tx = Prisma.TransactionClient;

export type Actor =
  | { kind: "admin"; adminUserId: string; request?: Request }
  | { kind: "anonymous"; request?: Request };

/** Run `work` in one transaction, attributed to `actor` in the audit trail. */
export async function withActor<T>(actor: Actor, work: (tx: Tx) => Promise<T>): Promise<T> {
  const adminId = actor.kind === "admin" ? actor.adminUserId : "";
  const actorType = actor.kind === "admin" ? "ADMIN" : "ANONYMOUS";
  const ipHash = actor.request ? keyedHash("ip", clientIp(actor.request)) : "";
  const userAgent = actor.request?.headers.get("user-agent");
  const userAgentHash = userAgent ? keyedHash("user-agent", userAgent) : "";

  return db.$transaction(async (tx) => {
    await tx.$queryRaw`
      SELECT set_config('app.admin_id', ${adminId}, true),
             set_config('app.actor_type', ${actorType}, true),
             set_config('app.ip_hash', ${ipHash}, true),
             set_config('app.user_agent_hash', ${userAgentHash}, true)`;
    return work(tx);
  });
}
