// tailwind.config.ts
// Every value here maps directly to DESIGN-SYSTEM.md v3 §1/§2 — no magic hex
// values or ad hoc font-family strings should appear in components.

import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Graphite — the dominant dark (60%)
        night: {
          DEFAULT: "#131519", // raised dark surface
          deep: "#0B0C0E", // base dark
          soft: "#1B1E23", // cards on dark
        },
        // Bone — the light surfaces
        paper: "#F4F2EE", // base light (also the "on dark" text colour)
        sheet: "#FCFBF9", // cards on light
        // Ink
        ink: "#121417",
        slate: { DEFAULT: "#4B5159" }, // secondary text on light (7.17:1 on paper)
        mist: "#A3A9B1", // secondary text on dark (8.26:1)
        line: "#7C858F", // labels / linework on dark (5.23:1)
        // International Orange — the one accent (10%)
        ember: {
          DEFAULT: "#FF5B1F", // on dark (6.31:1) and as a fill with ink text (5.95:1)
          soft: "#FFB547", // gradient partner only
        },
        accent: { DEFAULT: "#C2410C" }, // ember as text on light (4.63:1 paper, 5.01:1 sheet)
        // Status — data, never decoration (Status.colorToken)
        signal: {
          finished: "#0F7A4B",
          progress: "#C2410C",
          planned: "#5B616A",
        },
        critical: "#B42318",
        // shadcn/ui semantic tokens, mapped onto this palette (globals.css)
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
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
      },
      fontFamily: {
        sans: ["var(--font-ibm-plex-sans)", "system-ui", "sans-serif"],
        serif: ["var(--font-ibm-plex-serif)", "Georgia", "serif"],
        mono: ["var(--font-ibm-plex-mono)", "monospace"],
      },
      maxWidth: {
        prose: "72ch",
      },
      borderRadius: {
        // One radius family (§3): rounded-2xl cards, rounded-full buttons and
        // chips. lg/md/sm follow --radius so shadcn components match.
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      boxShadow: {
        // Layered, soft, tinted by the graphite — never pure black (§4.3).
        soft: "0 1px 2px rgb(16 17 20 / 0.04), 0 8px 24px -12px rgb(16 17 20 / 0.18)",
        lift: "0 2px 4px rgb(16 17 20 / 0.05), 0 28px 56px -24px rgb(16 17 20 / 0.38)",
        "glow-ember": "0 12px 32px -10px rgb(255 91 31 / 0.6)",
        "inset-hair": "inset 0 1px 0 0 rgb(255 255 255 / 0.06)",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};

export default config;
