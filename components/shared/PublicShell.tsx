// components/shared/PublicShell.tsx
// The public chrome: skip link, header, <main> in the shared Container, footer.
// Used by the (public) layout and by app/not-found.tsx — a root not-found
// renders above the (public) layout, so it has to compose the chrome itself
// or the 404 would be a bare page.
//
// <main> is a plain block, not a flex column: inside a flex column, a
// child's `mx-auto` disables stretch and the page collapses to its content
// width (this is what squeezed /contact's form to ~183px). Container gives
// every page the same frame.

import { Container } from "@/components/shared/Container";
import { SiteHeader } from "@/components/shared/SiteHeader";
import { SiteFooter } from "@/components/shared/SiteFooter";

export function PublicShell({ children }: { children: React.ReactNode }) {
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
