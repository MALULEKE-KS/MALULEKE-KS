// tailwind.config.ts
// Every value here maps directly to DESIGN-SYSTEM.md v2 §1/§2 — no magic hex
// values or ad hoc font-family strings should appear in components.

import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Surfaces
        paper: "#F4F1EA", // vellum — base surface
        sheet: "#FFFDF8", // raised surface — cards, fields, title block
        blueprint: {
          DEFAULT: "#0B2A4A", // primary
          deep: "#06182E", // header, footer, deep bands
        },
        // Ink
        ink: "#0F1729",
        slate: { DEFAULT: "#3D4A5C" },
        mist: "#B7C9DF", // secondary text on blueprint (8.61:1)
        line: "#7CA7D6", // drafting linework on blueprint (non-text)
        // Accent — one hue, two values (§1): amber on dark / as a fill,
        // brass as text or line on light. Amber text on paper fails (1.64:1).
        amber: "#F5B335",
        accent: { DEFAULT: "#8A5D12" },
        signal: {
          finished: "#1F6F5C",
          progress: "#8A5D12", // == accent
          planned: "#5A6470",
        },
        critical: "#9B3A2E",
        // shadcn/ui semantic tokens — mapped onto this palette (globals.css
        // :root) so anything added via the CLI inherits it.
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
        // Sharp corners — drawings don't have rounded sheets.
        DEFAULT: "2px",
        none: "0px",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 1px)",
        sm: "calc(var(--radius) - 1px)",
      },
      boxShadow: {
        // §4.3 — depth is printed, not lit: hard offsets, no blur.
        print: "6px 6px 0 0 #0B2A4A",
        "print-sm": "3px 3px 0 0 #0F1729",
        "print-amber": "6px 6px 0 0 #F5B335",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
