// POST /api/v1/admin/auth/logout — sign out (#104). Sessions are signed
// cookies, not server-side rows, so clearing this browser's cookie alone
// would leave any copy of it valid until it expired. Signing out therefore
// also bumps the admin's session version (the same mechanism a password change
// uses, BR-3.15): every session ends — for a single-owner admin, "sign out"
// means "sign out everywhere". Audited (BR-3.4). CSRF-checked by withAdmin.

import { NextResponse } from "next/server";
import { logActivity } from "@/lib/auth/activity-log";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";
import { withAdmin } from "@/lib/auth/with-admin";

export const POST = withAdmin(async (request, { adminUserId, write }) => {
  await write((tx) => tx.adminUser.update({ where: { id: adminUserId }, data: { sessionVersion: { increment: 1 } } }));
  await logActivity({ adminUserId, action: "auth.logout", request });
  const response = NextResponse.json({ signedOut: true });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
});
