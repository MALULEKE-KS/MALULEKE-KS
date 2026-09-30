// lib/content/sheets.ts
// The drawing set (DESIGN-SYSTEM.md v2 §3): every public page is a numbered
// sheet, in nav order. One list, so the nav, footer and each page's title
// block can never disagree about what sheet a page is. The owner's details are
// data — the admin-editable profile (lib/queries/site.ts, #99) — not code.

export interface Sheet {
  number: string;
  href: string;
  label: string;
}

export const SHEETS: Sheet[] = [
  { number: "01", href: "/", label: "Home" },
  { number: "02", href: "/systems", label: "Systems" },
  { number: "03", href: "/journey", label: "Journey" },
  { number: "04", href: "/cv", label: "CV" },
  { number: "05", href: "/how-i-build", label: "How I build" },
  { number: "06", href: "/about", label: "About" },
  { number: "07", href: "/contact", label: "Contact" },
];

// The stack this platform itself runs on — real, from CLAUDE.md "Stack".
export const PLATFORM_STACK = ["Next.js", "TypeScript", "PostgreSQL", "Prisma", "Vercel"];
