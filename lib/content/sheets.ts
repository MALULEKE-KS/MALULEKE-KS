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
  /** What the page holds, in a few words — the phone menu's second line (a UI label, not a claim). */
  hint: string;
}

export const SHEETS: Sheet[] = [
  { number: "01", href: "/", label: "Home", inHeader: false, hint: "Where it all starts" },
  { number: "02", href: "/systems", label: "Systems", inHeader: true, hint: "Everything built, straight from GitHub" },
  { number: "03", href: "/journey", label: "Journey", inHeader: true, hint: "From school to now, and what's next" },
  { number: "04", href: "/about", label: "About", inHeader: true, hint: "The person, and how he builds" },
  { number: "05", href: "/contact", label: "Contact", inHeader: false, hint: "Let's talk — one conversation, any reason" },
  // No CV page (owner, 2026-10-02): the uploaded CV is a button wherever it's useful.
  // No Method page: it's a section of About (/method redirects there).
];

