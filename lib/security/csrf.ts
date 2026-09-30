// lib/security/csrf.ts
// BR-3.9 — cross-site request forgery protection for every state-changing
// admin request, on top of the SameSite=Strict session cookie. A forged
// request needs the victim's browser, and browsers always say where a request
// comes from: Origin on every cross-origin POST/PATCH/DELETE (and same-origin
// ones), Sec-Fetch-Site on modern browsers. Either one naming another site is
// refused. A request with neither isn't from a browser, so it can't be
// carrying a victim's cookies — it has to present its own session like any
// other caller.

import { NextResponse } from "next/server";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function ownHost(request: Request): string {
  return request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? new URL(request.url).host;
}

/** A 403 for a cross-site state-changing request, or null if it may proceed. */
export function crossSiteRefusal(request: Request): Response | null {
  if (SAFE_METHODS.has(request.method.toUpperCase())) return null;

  const origin = request.headers.get("origin");
  const fetchSite = request.headers.get("sec-fetch-site");

  let crossSite = false;
  if (origin !== null) {
    try {
      crossSite = origin === "null" || new URL(origin).host !== ownHost(request);
    } catch {
      crossSite = true;
    }
  }
  if (fetchSite !== null && fetchSite !== "same-origin" && fetchSite !== "none") crossSite = true;

  return crossSite
    ? NextResponse.json(
        { error: { code: "CSRF_REJECTED", message: "Cross-site requests can't change anything here.", details: null } },
        { status: 403 },
      )
    : null;
}
