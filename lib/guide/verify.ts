// lib/guide/verify.ts
// The answer verifier (docs/AI-GUIDE-PHASE2-PLAN.md §4 B2). After the guide
// answers, every checkable claim in what it said about Kurhula or the site is
// looked up in the site's own data — in code, with no model. What it finds:
//
//   path        a link to a page or system that doesn't exist
//   link        an outside link that isn't in the knowledge
//   technology  "he uses X" when no system, repo or skill of his names X
//   year        a year the data never mentions
//   number      "12 systems", "3 commits", "5 months" the data doesn't contain
//   figure      a salary, rate or price
//
// The verifier never rewrites a streamed answer and never says an answer is false:
// it says what it could not find in the data, and counts what it did find. A claim
// is only examined in a sentence about him or the site (a general fact about
// Kubernetes is not a claim about Kurhula), and a sentence that denies ("there's no
// Kubernetes in his stack") is not a claim at all.

import type { GuideCorpus } from "@/lib/guide/corpus";
import { MONEY_FIGURE } from "@/lib/guide/answer-rules";
import { techMentions } from "@/lib/guide/tech-lexicon";

export type ClaimKind = "path" | "link" | "technology" | "year" | "number" | "figure";

export interface FlaggedClaim {
  kind: ClaimKind;
  text: string;
}

export interface Verification {
  /** Claims looked up in the data. */
  checked: number;
  /** The ones the data does not contain, at most the owner's limit (concierge.verifier.maxFlagged). */
  flagged: FlaggedClaim[];
}

// A sentence is about him or the site when it says so — or names one of his systems (see aboutHim below).
const ABOUT_HIM = /\b(he|his|him|kurhula|himself|platform|the site|this site|portfolio|the guide|the system|this system|that system|his work)\b/i;
// A denial, a hedge, or a statement of what a role *asks for*: the sentence isn't asserting that he has the thing it names.
const DENIES = /n't\b|\b(not|no|never|none|without|nothing|neither|nor|lacks?|lacking|cannot|unlisted|unverified|unclear|unknown|beyond|gaps?|missing|yet|asked for|asks for|requires?|required|requirements?|needs?|needed|wants?|looking for)\b/i;
const QUANTITY = /\b(\d{1,3}(?:[ ,]\d{3})+|\d+)\s+(systems?|projects?|repos?|repositories|commits?|rules?|stars?|users?|customers?|clients?|downloads?|years?|months?|weeks?|days?|hours?)\b/gi;
const YEAR = /\b(?:19|20)\d{2}\b/g;
const URL = /https?:\/\/[^\s)\]>"'`]+/g;
const PATH = /(?<![\w/:.@-])\/[a-z][a-z0-9-]*(?:\/[a-z0-9-]+)*(?:#[a-z0-9-]+)?/g;

const lowered = new WeakMap<GuideCorpus, string>();
const nameCues = new WeakMap<GuideCorpus, RegExp | null>();

/** A pattern for the names of his systems and repos in the knowledge ("### Name (source: …)"), or null. */
function systemNameCue(c: GuideCorpus): RegExp | null {
  if (nameCues.has(c)) return nameCues.get(c)!;
  // A repo's heading is "owner/name — name"; a system's is just its name.
  const names = [...c.text.matchAll(/^### (.+?) \(source:/gm)].map((m) => (m[1]!.split(" — ").pop() ?? "").trim()).filter((n) => n.length > 2);
  const escaped = [...new Set(names)].map((n) => n.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
  const re = escaped.length ? new RegExp(escaped.join("|"), "i") : null;
  nameCues.set(c, re);
  return re;
}
const corpusLower = (c: GuideCorpus) => {
  let t = lowered.get(c);
  if (t === undefined) {
    t = c.text.toLowerCase();
    lowered.set(c, t);
  }
  return t;
};

/** Plain prose: code (fenced and inline) and markdown marks removed — what's left is what the guide asserts. */
function proseOf(answer: string): string {
  return answer
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/\*\*|__|\*(?=\S)|(?<=\S)\*/g, "")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 $2");
}

const sentencesOf = (prose: string) => prose.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean);

const singular = (noun: string) => noun.toLowerCase().replace(/ies$/, "y").replace(/s$/, "");

// Words the guide uses for the same thing: a count of "projects" is checked against the data's "systems".
const SAME_THING: string[][] = [
  ["system", "project", "app", "product"],
  ["repo", "repository"],
  ["commit"],
  ["rule"],
  ["star"],
  ["user", "customer", "client"],
  ["download"],
  ["year"],
  ["month"],
  ["week"],
  ["day"],
  ["hour"],
];

/** Is "<amount> <noun>" in the data — allowing a word or two between ("12 public repositories") and a synonym? */
function quantityInData(data: string, amount: string, noun: string): boolean {
  const base = singular(noun);
  const group = SAME_THING.find((g) => g.includes(base)) ?? [base];
  const nouns = group.map((n) => (/[^aeiou]y$/.test(n) ? `${n.slice(0, -1)}(?:y|ies)` : `${n}s?`)).join("|");
  const digits = amount.replace(/[, ]/g, "");
  // The amount as a whole number of its own (not part of a date, a version or a decimal)…
  const amountRe = new RegExp(`(?<![\\d.:/-])${digits.replace(/\B(?=(\d{3})+$)/g, ",?")}(?![\\d.:/-]|,\\d)`);
  const nounRe = new RegExp(`\\b(?:${nouns})\\b`);
  // …on the same line as the thing it counts.
  return data.split("\n").some((line) => amountRe.test(line) && nounRe.test(line));
}

export interface VerifyInput {
  answer: string;
  /** The visitor's last question — what they said themselves isn't a claim by the guide. */
  question: string;
  corpus: GuideCorpus;
  /** concierge.verifier.maxFlagged: the most claims listed as not found. */
  maxFlagged: number;
  now?: Date;
}

export function verifyAnswer({ answer, question, corpus, maxFlagged, now = new Date() }: VerifyInput): Verification {
  const prose = proseOf(answer);
  const data = corpusLower(corpus);
  const said = question.toLowerCase();
  const flagged: FlaggedClaim[] = [];
  const seen = new Set<string>();
  let checked = 0;
  const flag = (kind: ClaimKind, text: string) => {
    const key = `${kind}:${text.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    if (flagged.length < maxFlagged) flagged.push({ kind, text });
  };
  const count = (kind: ClaimKind, text: string, found: boolean) => {
    const key = `seen:${kind}:${text.toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    checked += 1;
    if (!found) flag(kind, text);
  };

  // Links and paths: checked wherever they appear.
  const pageRoots = new Set(corpus.paths.map((p) => p.split("/")[1]).filter(Boolean));
  for (const raw of prose.match(PATH) ?? []) {
    const path = raw.replace(/#.*$/, "").replace(/\/$/, "") || "/";
    if (!pageRoots.has(path.split("/")[1] ?? "")) continue; // not one of the site's pages (e.g. a file path or an API route)
    count("path", raw, corpus.paths.includes(path));
  }
  for (const raw of prose.match(URL) ?? []) {
    const url = raw.replace(/[.,;:!?]+$/, "");
    if (said.includes(url.toLowerCase())) continue;
    count("link", url, data.includes(url.toLowerCase()) || data.split(/\s+/).some((w) => w.startsWith("http") && url.toLowerCase().startsWith(w.replace(/[.,;:)]+$/, ""))));
  }

  const cue = systemNameCue(corpus);
  // Facts: only in sentences about him or the site, and only where the sentence asserts rather than denies.
  for (const raw of sentencesOf(prose)) {
    // Links were checked above; words inside them ("not-a-real-system") must not read as a denial.
    const sentence = raw.replace(URL, " ").replace(PATH, " ");
    if (!(ABOUT_HIM.test(sentence) || cue?.test(sentence)) || DENIES.test(sentence)) continue;

    for (const tech of techMentions(sentence)) {
      const inData = data.includes(tech.toLowerCase()) || (tech === "PostgreSQL" && data.includes("postgres")) || (tech === "Postgres" && data.includes("postgresql"));
      count("technology", tech, inData);
    }

    for (const year of sentence.match(YEAR) ?? []) {
      if (said.includes(year) || Number(year) === now.getUTCFullYear()) continue;
      count("year", year, data.includes(year));
    }

    for (const m of sentence.matchAll(QUANTITY)) {
      const [phrase, amount, noun] = m;
      if (said.includes(phrase.toLowerCase())) continue;
      count("number", phrase, quantityInData(data, amount!, noun!));
    }

    for (const m of sentence.matchAll(new RegExp(MONEY_FIGURE.source, "g"))) {
      if (said.includes(m[0].toLowerCase())) continue;
      count("figure", m[0], data.includes(m[0].toLowerCase()));
    }
  }

  return { checked, flagged };
}
