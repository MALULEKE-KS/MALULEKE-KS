// lib/content/principles.ts
// The four governing principles (PLATFORM-CONSTITUTION-v1.md §1), in plain
// language. One source for /how-i-build (full body) and the home page's
// principles band (summary), so the two can never drift apart.

export interface Principle {
  name: string;
  summary: string;
  body: string;
}

export const PRINCIPLES: Principle[] = [
  {
    name: "Extension Over Modification (EXT-1)",
    summary: "Anything expected to grow lives in data, never in a hard-coded list.",
    body: "Anything expected to grow — a new project category, a new type of visitor, a new skill — lives in a lookup table or config, never a hard-coded list. A new chapter of the work shouldn't require rebuilding the platform to fit it.",
  },
  {
    name: "Smart Not Hard",
    summary: "Buy the commodity, build the differentiated.",
    body: "Buy the commodity, build the differentiated. Off-the-shelf tools handle what's already a solved problem; real engineering time goes into the parts that actually need building.",
  },
  {
    name: "Controlled Imperfection Engineering",
    summary: "Failures made predictable and traceable, not chased into an impossible zero.",
    body: "Failures are made predictable and traceable, not chased into an impossible zero. Every admin action on this platform writes to an audit log — what goes wrong feeds directly into what gets fixed next, the same discipline an incident produces a runbook.",
  },
  {
    name: "Permission Boundaries",
    summary: "No AI acts autonomously on anything that matters.",
    body: "No AI acts autonomously on anything that matters. The one write path an automated agent can ever trigger here is the same inquiry form a human uses — never a more privileged shortcut.",
  },
];

export const MISSION =
  "I build systems disciplined enough to be trusted with real money, real institutions, and real people’s outcomes — engineered in South Africa, held to a global standard.";
