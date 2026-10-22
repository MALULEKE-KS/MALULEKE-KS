// lib/home/guide-knows.ts
// What the AI guide reads right now, said in the home band's card (D-043): the
// owner's template ("ai-guide".knowsLine) filled with live figures computed on the
// server. Pure, so it is unit-tested; a " · " part whose figure is missing is left
// out rather than shown empty or as a zero.

/** Live facts for the guide's card. */
export interface AiGuideFacts {
  /** Published systems the guide reads (the public catalogue). */
  systems: number;
  /** When GitHub was last synced, in words ("today", "2 days ago"); null when it never was. */
  synced: string | null;
}

export function fillKnows(template: string | undefined | null, facts: AiGuideFacts): string | null {
  if (!template?.trim()) return null;
  const values: Record<string, string | null> = {
    systems: facts.systems > 0 ? String(facts.systems) : null,
    synced: facts.synced?.trim() || null,
  };
  const parts = template
    .split(" · ")
    .filter((part) => [...part.matchAll(/\{(\w+)\}/g)].every((m) => values[m[1]!] != null))
    .map((part) => part.replace(/\{(\w+)\}/g, (_, k: string) => values[k] ?? ""))
    .filter((part) => part.trim());
  return parts.length ? parts.join(" · ") : null;
}
