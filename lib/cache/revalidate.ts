// lib/cache/revalidate.ts
// The public site is served from the CDN's cache (D-062, the owner, 2026-10-24: "the site
// is slow to load … even desktop"): each public page is rendered ahead, kept at the edge
// nearest the visitor, and rendered again in the background at most every few minutes
// (the (public) layout's `revalidate`). Anything that changes what a visitor sees — every
// admin write (withAdmin) and every job that finishes (runJob) — refreshes it at once, so
// the owner never waits for the timer to see his own change.
//
// Outside a Next.js request (an operator script, a test) there is no cache to refresh;
// that is not an error.

import { revalidatePath } from "next/cache";

export function refreshPublicSite(): void {
  try {
    revalidatePath("/", "layout");
  } catch {
    // Not inside a Next.js request (a script or a test): nothing is cached here.
  }
}
