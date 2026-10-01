// lib/auth/current-admin.ts
// The signed-in admin, for server components in the admin panel (#104). The
// proxy already gates every /admin page (BR-3.1); this checks again where the
// page reads data — defence in depth, the same session rules as the API
// (signature, idle and absolute expiry, session version) — and sends an
// expired session to sign-in with the neutral "session ended" copy.

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { checkSession, isSessionVersionCurrent, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export async function requireAdminId(): Promise<string> {
  const store = await cookies();
  const result = checkSession(store.get(SESSION_COOKIE_NAME)?.value);
  if (
    !result.valid ||
    result.sessionVersion === undefined ||
    !(await isSessionVersionCurrent(result.adminUserId!, result.sessionVersion))
  ) {
    redirect("/admin/login?reason=session_ended");
  }
  return result.adminUserId!;
}
