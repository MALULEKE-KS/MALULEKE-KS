// app/layout.tsx
// Root layout — IBM Plex Sans/Serif/Mono font loading (Design System §2),
// VisitorLensProvider wrapping the tree.
//
// This was a stub until now — tailwind.config.ts has always referenced
// var(--font-ibm-plex-sans/serif/mono) as the actual font-family values,
// but nothing ever defined those CSS custom properties, since that's
// exactly what next/font generates when wired into the root layout. Every
// page has been silently falling back to the system font stack since the
// project's structure was first scaffolded.

import { IBM_Plex_Sans, IBM_Plex_Serif, IBM_Plex_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import type { Metadata } from "next";
import { VisitorLensProvider } from "@/components/shared/VisitorLensProvider";
import { getSiteProfile } from "@/lib/queries/site";
import { siteUrl } from "@/lib/site-url";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans",
  display: "swap",
});

const ibmPlexSerif = IBM_Plex_Serif({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-serif",
  display: "swap",
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

// Site-wide metadata (#101): absolute URLs from the configured site URL, and a
// description built from the owner's profile (admin-editable) rather than
// typed-in copy. If the database is unreachable, metadata falls back to
// static defaults instead of failing every page.
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
