// app/(public)/layout.tsx
// SiteHeader belongs here, not the root layout — (admin) pages (starting
// with /admin/login) must not show the public marketing nav above a
// focused login screen (Design System §5's own login mockup is just
// "MALULEKE-KS / Admin", no Systems/Journey/CV/etc. nav bar). Route groups
// exist precisely so different sections can have different chrome; the
// root layout only owns what's truly global (fonts, <html>/<body>).
//
// <main> is a plain block, not a flex column: inside a flex column, a
// child's `mx-auto` disables stretch and the page collapses to its content
// width (this is what squeezed /contact's form to ~183px). Container gives
// every page the same frame.

import { Container } from "@/components/shared/Container";
import { SiteHeader } from "@/components/shared/SiteHeader";
import { SiteFooter } from "@/components/shared/SiteFooter";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-10 focus:bg-ink focus:px-4 focus:py-2 focus:text-sm focus:text-paper"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="flex-1">
        <Container>{children}</Container>
      </main>
      <SiteFooter />
    </div>
  );
}
