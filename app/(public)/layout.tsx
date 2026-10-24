// app/(public)/layout.tsx
// SiteHeader belongs here, not the root layout — (admin) pages (starting
// with /admin/login) must not show the public marketing nav above a
// focused login screen (Design System §5's own login mockup is just
// "MALULEKE-KS / Admin", no Systems/Journey/CV/etc. nav bar). Route groups
// exist precisely so different sections can have different chrome; the
// root layout only owns what's truly global (fonts, <html>/<body>).
//
// The chrome itself lives in PublicShell so app/not-found.tsx can reuse it.
//
// Served from the CDN's cache (D-062): every public page is rendered ahead and kept at the
// edge nearest the visitor, then rendered again in the background at most every 5 minutes —
// so a visitor never waits on a database round trip across the ocean. Whatever the owner
// changes in Admin, and whatever a job changes, refreshes the site at once
// (lib/cache/revalidate.ts); the timer only keeps the "ago" lines and the day's counts
// current. A page that reads the URL's query (the catalogue's filters) stays per request.
// The interval is a literal because Next.js reads it at build time.

import { PublicShell } from "@/components/shared/PublicShell";

export const revalidate = 300;

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
