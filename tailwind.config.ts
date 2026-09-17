// tailwind.config.ts
// Every value here maps directly to DESIGN-SYSTEM.md §1/§2 — no magic hex
// values or ad hoc font-family strings should appear in components.

import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0F1729",
        paper: "#F5F7FA",
        slate: {
          DEFAULT: "#3D4A5C",
        },
        accent: {
          DEFAULT: "#906722", // corrected from #C08A2E — the original failed WCAG AA
          // as text (2.83:1). This value passes at 4.72:1 while still reading
          // as brass/gold. See DESIGN-SYSTEM.md §1 for the verification.
        },
        signal: {
          finished: "#1F6F5C",
          progress: "#906722", // == accent, unchanged from the original design intent
          planned: "#5A6470", // corrected from #6B7684 — original failed AA-normal (4.30:1); this passes at 5.60:1
        },
        critical: "#9B3A2E",
        // shadcn/ui semantic tokens — mapped to this project's own palette
        // (globals.css :root, via HSL custom properties) rather than
        // shadcn's default gray/blue, so a component pulled in later via
        // the CLI (`npx shadcn add ...`) is on-brand by default instead of
        // needing every instance restyled by hand.
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
      },
      fontFamily: {
        sans: ["var(--font-ibm-plex-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-ibm-plex-serif)", "Georgia", "serif"],
        mono: ["var(--font-ibm-plex-mono)", "monospace"],
      },
      maxWidth: {
        prose: "72ch", // keeps body copy under the 80-character line length rule
      },
      borderRadius: {
        // Deliberately minimal — the design system avoids the uniform
        // rounded-card treatment. Sharp or barely-softened corners only.
        // lg/md/sm derive from --radius (globals.css, set to 2px) so any
        // shadcn component using them inherits the same restraint.
        DEFAULT: "2px",
        none: "0px",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 1px)",
        sm: "calc(var(--radius) - 1px)",
      },
      boxShadow: {
        // No default drop shadow token defined on purpose — dividers use
        // hairline borders (Design System §3), not soft shadows.
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
