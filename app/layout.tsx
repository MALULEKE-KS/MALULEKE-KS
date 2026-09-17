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
import "./globals.css";
import { VisitorLensProvider } from "@/components/shared/VisitorLensProvider";
import { SiteHeader } from "@/components/shared/SiteHeader";

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

export const metadata = {
  title: "MALULEKE-KS",
  description: "Kurhula Success Maluleke's personal platform.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      className={`${ibmPlexSans.variable} ${ibmPlexSerif.variable} ${ibmPlexMono.variable}`}
    >
      <body className="font-sans bg-paper text-ink">
        <VisitorLensProvider>
          <SiteHeader />
          {children}
        </VisitorLensProvider>
      </body>
    </html>
  );
}
