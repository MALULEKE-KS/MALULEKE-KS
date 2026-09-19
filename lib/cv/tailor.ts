// lib/cv/tailor.ts
// Role tailoring for the CV engine (#74). A target role ("AI Engineer",
// "Backend Developer") becomes a set of terms; each project, highlight, skill
// and module is scored by how many of those terms it mentions, and the most
// relevant come first. Tailoring only reorders (and picks the top projects) —
// it never rewrites or invents a word of the owner's content.
//
// The related-terms map is domain knowledge about role vocabulary (logic, not
// a tunable), kept small and explicit so a match is always explainable.

const STOPWORDS = new Set([
  "a", "an", "and", "at", "for", "in", "of", "on", "or", "the", "to", "with",
  // Generic role words match every CV equally, so they carry no signal.
  "engineer", "engineering", "developer", "development", "senior", "junior", "lead",
  "principal", "intern", "graduate", "role", "position", "specialist",
]);

const RELATED_TERMS: Record<string, string[]> = {
  ai: ["ai", "ml", "machine learning", "llm", "artificial intelligence", "model", "rag", "embedding", "agent"],
  ml: ["ml", "machine learning", "model", "training", "python", "ai"],
  data: ["data", "sql", "postgresql", "analytics", "pipeline", "etl"],
  frontend: ["frontend", "react", "next.js", "nextjs", "ui", "css", "tailwind", "typescript", "accessibility"],
  backend: ["backend", "api", "node", "database", "postgresql", "prisma", "server", "rest"],
  fullstack: ["fullstack", "full-stack", "frontend", "backend", "react", "next.js", "api", "database"],
  "full-stack": ["fullstack", "full-stack", "frontend", "backend", "react", "next.js", "api", "database"],
  software: ["software", "typescript", "testing", "architecture", "api"],
  devops: ["devops", "ci", "cd", "vercel", "docker", "infrastructure", "deployment", "monitoring"],
  cloud: ["cloud", "vercel", "aws", "azure", "gcp", "serverless", "infrastructure"],
  mobile: ["mobile", "react native", "ios", "android"],
  security: ["security", "auth", "2fa", "encryption", "audit"],
};

/** The terms a target role implies, lowercase and de-duplicated. Empty when there's no role. */
export function roleTerms(targetRole: string | null | undefined): string[] {
  if (!targetRole) return [];
  const words = targetRole
    .toLowerCase()
    .split(/[^a-z0-9.+#-]+/)
    .filter((w) => w.length > 0 && !STOPWORDS.has(w));
  const terms = new Set<string>();
  for (const word of words) {
    terms.add(word);
    for (const related of RELATED_TERMS[word] ?? []) terms.add(related);
  }
  return [...terms];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** How many of the terms appear in the text, as whole words or phrases. */
export function relevance(text: string, terms: string[]): number {
  const haystack = text.toLowerCase();
  return terms.reduce(
    (score, term) => score + (new RegExp(`(^|[^a-z0-9])${escapeRegExp(term)}($|[^a-z0-9])`).test(haystack) ? 1 : 0),
    0,
  );
}
