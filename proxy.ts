// proxy.ts
// Next.js 16 renamed the "middleware" file convention to "proxy" (this file
// was migrated via `npx @next/codemod middleware-to-proxy`). Runs before
// every request under (admin): session check (BR-3.1, BR-3.3, BR-3.7),
// sliding-window refresh on every valid request.
//
// Proxy (the Next.js 16 rename of middleware) always runs on Node.js
// runtime now — no runtime export needed or allowed here, unlike the old
// middleware convention where Edge was the default and Node.js needed an
// explicit opt-in. lib/auth/session.ts's use of node:crypto works here
// precisely because of that change.
//
// CSRF (BR-3.9) is handled by the session cookie's own SameSite=Strict
// attribute (see lib/auth/session.ts), not a separate check here.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { checkSession, SESSION_COOKIE_NAME, SESSION_COOKIE_OPTIONS } from "@/lib/auth/session";

// Never gated: the login page itself and the two auth endpoints that issue
// the session in the first place — gating these would make login impossible.
const PUBLIC_ADMIN_PATHS = ["/admin/login", "/api/v1/admin/auth/login", "/api/v1/admin/auth/verify-2fa"];

function isProtectedPath(pathname: string): boolean {
  const isAdminSurface = pathname.startsWith("/admin") || pathname.startsWith("/api/v1/admin");
  return isAdminSurface && !PUBLIC_ADMIN_PATHS.some((p) => pathname.startsWith(p));
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  const result = checkSession(request.cookies.get(SESSION_COOKIE_NAME)?.value);

  if (!result.valid) {
    const isApiRoute = pathname.startsWith("/api/v1/admin");
    if (isApiRoute) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Session expired or invalid.", details: null } },
        { status: 401 }
      );
    }
    // Neutral copy, not styled as an error — nothing went wrong (Design
    // System §5's own stated behavior for both idle and absolute expiry).
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("reason", "session_ended");
    const response = NextResponse.redirect(loginUrl);
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }

  // Valid — refresh the sliding idle window on every authenticated request.
  const response = NextResponse.next();
  if (result.refreshedCookieValue) {
    response.cookies.set(SESSION_COOKIE_NAME, result.refreshedCookieValue, SESSION_COOKIE_OPTIONS);
  }
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/api/v1/admin/:path*"],
};
