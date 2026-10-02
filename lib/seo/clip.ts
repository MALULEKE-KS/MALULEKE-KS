// lib/seo/clip.ts
// A meta description from the site's own text: at most ~160 characters, cut
// at a word boundary and ended cleanly — never mid-word, never "a database that…".

const MAX = 160;

export function clip(text: string, max = MAX): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  // Prefer a whole sentence that fits; otherwise the last whole word, with an ellipsis.
  const sentences = clean.match(/[^.!?]+[.!?]+/g) ?? [];
  let out = "";
  for (const s of sentences) {
    if ((out + s).trim().length > max) break;
    out += s;
  }
  if (out.trim().length >= max * 0.5) return out.trim();
  const cut = clean.slice(0, max - 1);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:—–-]\s*$/, "")}…`;
}
