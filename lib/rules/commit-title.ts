// lib/rules/commit-title.ts
// How a commit reads on the site (D-061): its first line, without the repo's bookkeeping.

/** One code a commit may carry: a decision ("D-057", "D-054–D-056") or a pull request ("#258"). */
const CODE = String.raw`(?:#\d+|D-\d+(?:\s*[–-]\s*D-\d+)?)`;
/** A bracket holding only codes — "(D-057)", "(#258)", "(D-058, D-059)" — and the space before it. */
const CODES = new RegExp(String.raw`\s*\(${CODE}(?:\s*,\s*${CODE})*\)`, "g");

/**
 * A commit message's first line, as a visitor should read it: the rest is detail the feed doesn't
 * need, and the repo's own bookkeeping — decision codes and a squash-merge's pull request number —
 * is left out (D-061). The stored message is never rewritten.
 */
export function commitTitle(message: string): string {
  return (message.split("\n")[0] ?? "").replace(CODES, "").replace(/\s{2,}/g, " ").trim().slice(0, 140);
}
