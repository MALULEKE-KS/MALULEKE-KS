// app/layout.tsx
// Root layout — IBM Plex Sans/Serif/Mono font loading (Design System §2),
// VisitorLensProvider wrapping the tree.
//
// The fonts are self-hosted from the @fontsource packages (the latin files, the
// weights the design uses) through next/font/local: no request to Google at build
// or run time, so a build never fails on a font download and the browser fetches
// the files from this site's own origin (docs/improvements/HOME-HERO-PLAN.md §19).
// next/font generates the CSS custom properties the stylesheet uses
// (var(--font-ibm-plex-sans/serif/mono)).

import localFont from "next/font/local";
import Script from "next/script";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { VisitorLensProvider } from "@/components/shared/VisitorLensProvider";
import { getSiteProfile } from "@/lib/queries/site";
import { siteUrl } from "@/lib/site-url";

const ibmPlexSans = localFont({
  src: [
    { path: "../node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-600-normal.woff2", weight: "600", style: "normal" },
    // Weight 700 is asked for in one place (the wordmark); it reuses the 600 file, so the first load carries one file fewer (D-042).
    { path: "../node_modules/@fontsource/ibm-plex-sans/files/ibm-plex-sans-latin-600-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-ibm-plex-sans",
  display: "swap",
});

const ibmPlexSerif = localFont({
  // Italic for the editorial accent words in headlines ("Plex, elevated", owner's choice 2026-09-30).
  src: [
    { path: "../node_modules/@fontsource/ibm-plex-serif/files/ibm-plex-serif-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../node_modules/@fontsource/ibm-plex-serif/files/ibm-plex-serif-latin-400-italic.woff2", weight: "400", style: "italic" },
    { path: "../node_modules/@fontsource/ibm-plex-serif/files/ibm-plex-serif-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "../node_modules/@fontsource/ibm-plex-serif/files/ibm-plex-serif-latin-500-italic.woff2", weight: "500", style: "italic" },
    { path: "../node_modules/@fontsource/ibm-plex-serif/files/ibm-plex-serif-latin-600-normal.woff2", weight: "600", style: "normal" },
    { path: "../node_modules/@fontsource/ibm-plex-serif/files/ibm-plex-serif-latin-600-italic.woff2", weight: "600", style: "italic" },
  ],
  variable: "--font-ibm-plex-serif",
  display: "swap",
  // Used for accent words further down the page, not in the first view: it loads when needed instead of competing with the hero.
  preload: false,
});

const ibmPlexMono = localFont({
  src: [
    { path: "../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2", weight: "500", style: "normal" },
    // Mono 600 reuses the 500 file (the two are a hair apart at this size), another file fewer in the first load (D-042).
    { path: "../node_modules/@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-500-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

// Site-wide metadata (#101): absolute URLs from the configured site URL, and a
// description built from the owner's profile (admin-editable) rather than
// typed-in copy. If the database is unreachable, metadata falls back to
// static defaults instead of failing every page.
// The page runs edge to edge on a phone (viewport-fit=cover), so the fixed
// launcher, banner and footer can keep clear of the home bar and notch with
// env(safe-area-inset-*) (D-048); the browser's bar takes the graphite of the
// header. Zoom stays allowed (accessibility).
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0b0c0e",
};

export async function generateMetadata(): Promise<Metadata> {
  let name = "MALULEKE-KS";
  let description = "A full-stack, database-backed platform — the systems, the journey, the CV.";
  try {
    const profile = await getSiteProfile();
    name = profile.name;
    description =
      [profile.name, profile.headline, profile.location && `based in ${profile.location}`]
        .filter(Boolean)
        .join(" — ") + ".";
  } catch {
    // keep the defaults
  }
  return {
    metadataBase: new URL(siteUrl()),
    // Each page sets its own `title`; the template keeps the platform name on
    // every tab. Pages that set none (home, 404) fall back to the default.
    title: { default: `${name} — MALULEKE-KS`, template: "%s | MALULEKE-KS" },
    description,
    applicationName: "MALULEKE-KS",
    openGraph: {
      type: "website",
      siteName: "MALULEKE-KS",
      locale: "en_ZA",
      title: name,
      description,
    },
    twitter: { card: "summary_large_image", title: name, description },
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${ibmPlexSans.variable} ${ibmPlexSerif.variable} ${ibmPlexMono.variable}`}
      // The js-flag script in <body> adds `js` before hydration; React must not treat
      // that one extra class as a hydration mismatch.
      suppressHydrationWarning
    >
      <body className="bg-paper text-ink font-sans antialiased">
        <VisitorLensProvider>{children}</VisitorLensProvider>
        {/* Scroll reveals only hide content once we know JS is running
            (globals.css ".js [data-reveal]"), so a no-JS visitor never sees an
            invisible page. beforeInteractive is injected into the initial
            HTML and runs before hydration (next/script docs). */}
        <Script id="js-flag" strategy="beforeInteractive">
          {"document.documentElement.classList.add('js')"}
        </Script>
      </body>
    </html>
  );
}
