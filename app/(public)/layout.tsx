// app/(public)/layout.tsx
// SiteHeader belongs here, not the root layout — (admin) pages (starting
// with /admin/login) must not show the public marketing nav above a
// focused login screen (Design System §5's own login mockup is just
// "MALULEKE-KS / Admin", no Systems/Journey/CV/etc. nav bar). Route groups
// exist precisely so different sections can have different chrome; the
// root layout only owns what's truly global (fonts, <html>/<body>).
//
// The chrome itself lives in PublicShell so app/not-found.tsx can reuse it.

import { PublicShell } from "@/components/shared/PublicShell";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
