// lib/content/sheets.ts
// The drawing set (DESIGN-SYSTEM.md v2 §3): every public page is a numbered
// sheet, in nav order. One list, so the nav, footer and each page's title
// block can never disagree about what sheet a page is. The owner's details are
// data — the admin-editable profile (lib/queries/site.ts, #99) — not code.

export interface Sheet {
  number: string;
  href: string;
  label: string;
  /** In the header nav. Home is the logo; Contact is "Let's talk" (F5c, D10). */
  inHeader: boolean;
}

export const SHEETS: Sheet[] = [
  { number: "01", href: "/", label: "Home", inHeader: false },
  { number: "02", href: "/systems", label: "Systems", inHeader: true },
  { number: "03", href: "/journey", label: "Journey", inHeader: true },
  { number: "04", href: "/cv", label: "CV", inHeader: true },
  { number: "05", href: "/method", label: "Method", inHeader: true },
  { number: "06", href: "/about", label: "About", inHeader: true },
  { number: "07", href: "/contact", label: "Contact", inHeader: false },
];

// The stack this platform itself runs on — real, from CLAUDE.md "Stack".
export const PLATFORM_STACK = ["Next.js", "TypeScript", "PostgreSQL", "Prisma", "Vercel"];
