// lib/content/sheets.ts
// The drawing set (DESIGN-SYSTEM.md v2 §3): every public page is a numbered
// sheet, in nav order. One list, so the nav, footer and each page's title
// block can never disagree about what sheet a page is.

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

export const OWNER = {
  name: "Kurhula Success Maluleke",
  initials: "K.S. Maluleke",
  role: "Systems architect & full-stack engineer",
  location: "South Africa",
  email: "kurhula04s@gmail.com",
  linkedin: "https://za.linkedin.com/in/kurhula-success-maluleke-32153231a",
  whatsapp: "https://wa.me/27640708649",
  github: "https://github.com/MALULEKE-KS",
};

// The stack this platform itself runs on — real, from CLAUDE.md "Stack".
export const PLATFORM_STACK = ["Next.js", "TypeScript", "PostgreSQL", "Prisma", "Vercel"];
