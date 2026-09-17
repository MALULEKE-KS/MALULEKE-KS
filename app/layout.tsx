// app/layout.tsx
// Root layout — IBM Plex Sans/Serif/Mono font loading (Design System §2),
// VisitorLensProvider wrapping the tree.
// TODO: implement.

import "./globals.css";
import { VisitorLensProvider } from "@/components/shared/VisitorLensProvider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <VisitorLensProvider>{children}</VisitorLensProvider>
      </body>
    </html>
  );
}
