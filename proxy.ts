// proxy.ts
// Next.js 16 renamed the "middleware" file convention to "proxy" (this file
// was migrated via `npx @next/codemod middleware-to-proxy`). Runs before
// every request: (admin) route-group session check (BR-3.1, BR-3.3, BR-3.7),
// CSRF verification on mutating admin requests (BR-3.9), rate-limit hook
// wiring (lib/auth/rate-limit.ts).
// TODO: implement — see docs/BUSINESS-RULES-v1.md §3, docs/PROJECT-STRUCTURE.md.

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
