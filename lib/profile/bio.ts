// lib/profile/bio.ts
// The About page's split of the owner's own biography (D-046): the hero keeps his
// first sentence — about two lines on a phone — and the rest of the text, word for
// word, opens the story section below. Nothing is shortened or rewritten; the
// biography itself stays one field in Admin -> Profile.

export interface BioSplit {
  /** His first sentence, for the hero. Empty when there is no biography. */
  lead: string;
  /** Everything after it, paragraph by paragraph. */
  story: string[];
}

export function splitBio(bio: string | null | undefined): BioSplit {
  const paragraphs = (bio ?? "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  const [first, ...rest] = paragraphs;
  if (!first) return { lead: "", story: [] };
  // The first sentence ends at . ! or ? followed by a space and a capital or an opening quote.
  const match = /^(.+?[.!?])\s+(?=[A-Z“"‘'(])([\s\S]+)$/.exec(first);
  if (!match) return { lead: first, story: rest };
  return { lead: match[1]!, story: [match[2]!.trim(), ...rest] };
}
