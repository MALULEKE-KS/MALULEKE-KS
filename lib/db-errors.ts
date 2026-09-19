// lib/db-errors.ts
// The database enforces business rules itself (F1.2, F1.6b) and cites the rule
// in every refusal ("BR-1.11: ..."). This turns such a refusal back into the
// rule's own sentence, so a route can answer with a clear 4xx instead of a 500.

/** The database's own message for a refusal of `ruleId`, or null if `err` isn't one. */
export function ruleViolation(err: unknown, ruleId: string): string | null {
  if (!(err instanceof Error)) return null;
  const escaped = ruleId.replace(/\./g, "\\.");
  const match = err.message.match(new RegExp(`${escaped}:[^\\n"\`]*`));
  return match ? match[0].trim() : null;
}
