// app/(public)/layout.tsx
// SiteHeader belongs here, not the root layout — (admin) pages (starting
// with /admin/login) must not show the public marketing nav above a
// focused login screen (Design System §5's own login mockup is just
// "MALULEKE-KS / Admin", no Systems/Journey/CV/etc. nav bar). Route groups
// exist precisely so different sections can have different chrome; the
// root layout only owns what's truly global (fonts, <html>/<body>).

import { SiteHeader } from "@/components/shared/SiteHeader";
import { SiteFooter } from "@/components/shared/SiteFooter";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <SiteHeader />
      <div className="flex-1 flex flex-col">{children}</div>
      <SiteFooter />
    </div>
  );
}
