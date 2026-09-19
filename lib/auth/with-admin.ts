// lib/auth/with-admin.ts
// The admin middleware layer (F2.1, #80). Every admin route handler is wrapped
// in withAdmin(): it authenticates the session (BR-3.1 — sessions are only
// issued after 2FA) and gives the handler `write`, which runs its changes in
// one transaction attributed to that admin — so the database's audit trail
// (every change, logged by triggers) always knows who acted, with the
// request's hashed context. tests/integration/audit-trail.test.ts fails if an
// admin route isn't wrapped.

import { NextResponse } from "next/server";
import { getSessionAdminId } from "@/lib/auth/session";
import { withActor, type Tx } from "@/lib/audit";

export interface AdminContext {
  adminUserId: string;
  /** Run changes in one transaction, attributed to this admin in the audit trail. */
  write: <T>(work: (tx: Tx) => Promise<T>) => Promise<T>;
}

interface RouteContext<P> {
  params: Promise<P>;
}

const NO_PARAMS: RouteContext<Record<string, never>> = { params: Promise.resolve({}) };

export function withAdmin<P extends Record<string, string> = Record<string, never>>(
  handler: (request: Request, admin: AdminContext, context: RouteContext<P>) => Promise<Response>,
) {
  return async (request: Request, context?: RouteContext<P>): Promise<Response> => {
    const adminUserId = await getSessionAdminId(request);
    if (!adminUserId) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Session expired or invalid.", details: null } },
        { status: 401 },
      );
    }
    const admin: AdminContext = {
      adminUserId,
      write: (work) => withActor({ kind: "admin", adminUserId, request }, work),
    };
    return handler(request, admin, context ?? (NO_PARAMS as unknown as RouteContext<P>));
  };
}
