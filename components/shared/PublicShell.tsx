// components/shared/PublicShell.tsx
// The public chrome: skip link, header, <main>, footer. Used by the (public)
// layout and by app/not-found.tsx — a root not-found renders above the
// (public) layout, so it has to compose the chrome itself.
//
// <main> deliberately does NOT wrap children in the Container: pages are
// built from full-bleed bands (DESIGN-SYSTEM.md v2 §3), so each page places
// its own content in a Container inside each band. <main> stays a plain
// block, never a flex column — in a flex column a child's `mx-auto` turns
// off stretch and the page collapses to its content width.

import { SiteHeader } from "@/components/shared/SiteHeader";
import { SiteFooter } from "@/components/shared/SiteFooter";

export function PublicShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col">
      <a
        href="#main"
        className="focus:bg-amber focus:text-ink sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:text-sm"
      >
        Skip to content
      </a>
      <SiteHeader />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter />
    </div>
  );
}
