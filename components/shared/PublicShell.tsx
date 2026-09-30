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

import { connection } from "next/server";
import { SiteHeader } from "@/components/shared/SiteHeader";
import { SiteFooter } from "@/components/shared/SiteFooter";
import { ConsentProvider } from "@/components/shared/Consent";
import { getReviewSlaHours, getSiteProfile } from "@/lib/queries/site";

export async function PublicShell({ children }: { children: React.ReactNode }) {
  // The chrome reads live data, so it renders per request — never prerendered
  // at build (the root 404 would otherwise be baked with build-time data, or
  // fail where the build has no database, as CI's doesn't).
  await connection();
  // The owner's details for the footer, from the admin-editable profile (#99).
  // The review promise is the admin setting, never typed-in copy (BR-2.2).
  const [profile, reviewSlaHours] = await Promise.all([getSiteProfile(), getReviewSlaHours()]);
  return (
    // Analytics consent (BR-5.1/5.4) wraps the public site only — never the admin.
    <ConsentProvider>
      <div className="flex min-h-screen flex-col">
        <a
          href="#main"
          className="focus:bg-ember focus:text-ink sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:text-sm"
        >
          Skip to content
        </a>
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter profile={profile} reviewSlaHours={reviewSlaHours} />
      </div>
    </ConsentProvider>
  );
}
