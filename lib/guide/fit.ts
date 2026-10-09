// lib/guide/fit.ts
// Fit Check (docs/AI-GUIDE-PHASE2-PLAN.md §7): a visitor shares what they need —
// a job description, a list of skills — and the guide shows each need against
// the evidence on the site, honestly: evidenced (with the systems and roles that
// prove it), partial (studied, or only in part), or not evidenced yet. No score,
// no percentage, no hype — and no verdict from a model: the model only lists the
// needs; this code decides, from the site's own data, so the same needs always
// give the same card and a card can never claim more than the data shows.
//
// Three honesty rules are built in: a requirement for N years is never "evidenced"
// beyond the years he has actually been building; a seniority or leadership
// requirement is never met by building alone; and the evidence a card links is
// only ever a record a visitor can open.

import { dbPublic } from "@/lib/db";
import { getSkillEvidence } from "@/lib/queries/evidence";
import { techMentions } from "@/lib/guide/tech-lexicon";

export type FitStatus = "evidenced" | "partial" | "none";

export interface FitEvidence {
  kind: "system" | "role" | "study" | "skill";
  label: string;
  href: string;
}

export interface FitRow {
  requirement: string;
  status: FitStatus;
  evidence: FitEvidence[];
  note: string | null;
}

export interface FitCardData {
  rows: FitRow[];
  evidenced: number;
  partial: number;
  none: number;
}

export interface FitData {
  skills: { name: string; systemSlugs: string[]; systemCount: number; roleCount: number; studyCount: number }[];
  systems: { slug: string; name: string; tech: string[] }[];
  roles: { title: string; organization: string; skills: string[] }[];
  study: { qualification: string; coursework: string[] }[];
  buildingSinceYear: number | null;
  now: Date;
}

/** The owner's limits and wording (settings concierge.fit.*, content block "guide-fit"). */
export interface FitOptions {
  maxRequirements: number;
  maxEvidence: number;
  /** Notes with {years} and {since}; {since} is the year he started building. Null = say nothing. */
  yearsNote: string | null;
  seniorityNote: string | null;
  noneNote: string | null;
}

// ---- reading the requirement ------------------------------------------------------------------

/** "Node.js", "NodeJS" and "node js" are one thing; so are Postgres and PostgreSQL. */
const ALIASES: Record<string, string> = { nodejs: "node.js", node: "node.js", js: "javascript", ts: "typescript", postgres: "postgresql", pg: "postgresql", k8s: "kubernetes", ml: "machine learning", "ci/cd": "cicd", cicd: "cicd", reactjs: "react", nextjs: "next.js", vuejs: "vue", golang: "go" };

const canonical = (term: string) => {
  const t = term.toLowerCase().replace(/[^a-z0-9+#./ ]/g, " ").replace(/\s+/g, " ").trim();
  const bare = t.replace(/\.js$/, "js").replace(/[ .]/g, "");
  return ALIASES[t] ?? ALIASES[bare] ?? t;
};
const squash = (t: string) => canonical(t).replace(/[ .\-_/]/g, "");

const STOP = new Set(
  "a an and are as at be by for from has have in is it its of on or our that the their this to we with you your will can must should strong good solid excellent proven demonstrable demonstrated knowledge understanding experience experienced proficiency proficient ability able working work worked using use used building build built developing develop developer engineer engineering software skills skill years year plus least minimum required requirement requirements preferred preferably ideally familiarity familiar hands-on handson expertise".split(" "),
);

/** The words in a requirement that name a skill, a tool or a field. */
function contentTerms(requirement: string): string[] {
  return requirement
    .toLowerCase()
    .replace(/[^a-z0-9+#./ \-]/g, " ")
    .split(/\s+/)
    .map((w) => w.replace(/^[-./]+|[-./]+$/g, ""))
    .filter((w) => w.length >= 2 && !STOP.has(w) && !/^\d+\+?$/.test(w));
}

// Broad fields → the specific things that evidence them. Classifier vocabulary, not content.
const FIELDS: { triggers: string[]; evidence: string[] }[] = [
  { triggers: ["database", "databases", "sql", "relational", "rdbms"], evidence: ["postgresql", "sql", "prisma", "mysql", "sqlite", "mongodb"] },
  { triggers: ["frontend", "front-end", "ui", "web"], evidence: ["react", "next.js", "typescript", "javascript", "tailwind", "html", "css"] },
  { triggers: ["backend", "back-end", "server-side", "server"], evidence: ["node.js", "typescript", "postgresql", "python", "next.js", "prisma"] },
  { triggers: ["api", "apis", "rest", "restful", "graphql"], evidence: ["rest", "graphql", "next.js", "typescript", "openapi"] },
  { triggers: ["ai", "ml", "machine", "learning", "llm", "llms", "genai", "nlp"], evidence: ["python", "tensorflow", "pytorch", "yolov8", "machine learning", "ai", "openai", "langchain"] },
  { triggers: ["testing", "tests", "qa", "tdd", "automated"], evidence: ["vitest", "playwright", "jest", "testing"] },
  { triggers: ["cicd", "devops", "pipelines", "deployment", "deploy", "ci"], evidence: ["github actions", "vercel", "docker", "ci/cd", "cicd"] },
  { triggers: ["cloud", "hosting", "serverless"], evidence: ["vercel", "neon", "aws", "azure", "serverless"] },
  { triggers: ["security", "authentication", "auth", "2fa", "owasp"], evidence: ["2fa", "authentication", "security", "otp"] },
  { triggers: ["mobile", "android", "ios"], evidence: ["flutter", "react native", "kotlin", "swift"] },
  { triggers: ["agile", "scrum", "kanban"], evidence: ["agile", "scrum"] },
];

const SENIORITY = /\b(senior|lead|principal|staff|head of|manage[sr]?|management|director|architect|mentor(?:ing)?)\b/i;
const YEARS = /(\d{1,2})\s*\+?\s*(?:years?|yrs?)\b/i;

// ---- the evidence index -----------------------------------------------------------------------

interface Hit {
  strength: "evidenced" | "partial";
  evidence: FitEvidence[];
}

function matchTerm(term: string, data: FitData): Hit | null {
  const sq = squash(term);
  if (!sq) return null;
  const evidence: FitEvidence[] = [];
  let strength: Hit["strength"] | null = null;
  const consider = (s: Hit["strength"]) => {
    strength = strength === "evidenced" || s === "evidenced" ? "evidenced" : "partial";
  };

  // A skill the site lists.
  for (const skill of data.skills) {
    if (squash(skill.name) !== sq) continue;
    if (skill.systemCount > 0 || skill.roleCount > 0) {
      consider("evidenced");
      for (const slug of skill.systemSlugs) {
        const system = data.systems.find((s) => s.slug === slug);
        if (system) evidence.push({ kind: "system", label: system.name, href: `/systems/${system.slug}` });
      }
      if (skill.roleCount > 0) evidence.push({ kind: "role", label: `Used in ${skill.roleCount === 1 ? "a role" : `${skill.roleCount} roles`}`, href: "/journey" });
    } else if (skill.studyCount > 0) {
      consider("partial");
      evidence.push({ kind: "study", label: "Studied", href: "/journey" });
    } else {
      consider("partial");
      evidence.push({ kind: "skill", label: `${skill.name} (listed)`, href: "/about#skills" });
    }
  }

  // A technology in a system's stack.
  for (const system of data.systems) {
    if (system.tech.some((t) => squash(t) === sq)) {
      consider("evidenced");
      evidence.push({ kind: "system", label: system.name, href: `/systems/${system.slug}` });
    }
  }

  // A skill named in a role.
  for (const role of data.roles) {
    if (role.skills.some((t) => squash(t) === sq)) {
      consider("evidenced");
      evidence.push({ kind: "role", label: `${role.title}, ${role.organization}`, href: "/journey" });
    }
  }

  // Coursework.
  for (const edu of data.study) {
    if (edu.coursework.some((c) => squash(c) === sq || (canonical(term).length > 3 && canonical(c).includes(canonical(term))))) {
      consider("partial");
      evidence.push({ kind: "study", label: edu.qualification, href: "/journey" });
    }
  }

  return strength ? { strength, evidence: dedupe(evidence) } : null;
}

function dedupe(evidence: FitEvidence[]): FitEvidence[] {
  const seen = new Set<string>();
  return evidence.filter((e) => (seen.has(`${e.href}|${e.label}`) ? false : (seen.add(`${e.href}|${e.label}`), true)));
}

const cleanRequirement = (raw: string) => raw.replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, 120);

// ---- one requirement ---------------------------------------------------------------------------

export function matchRequirement(raw: string, data: FitData, options: FitOptions): FitRow {
  const requirement = cleanRequirement(raw);
  const terms = new Set<string>();
  for (const t of techMentions(requirement)) terms.add(t);
  const content = contentTerms(requirement);
  for (const t of content) terms.add(t);
  // Two- and three-word skills ("machine learning", "system design", "rest apis").
  for (let n = 2; n <= 3; n++) for (let i = 0; i + n <= content.length; i++) terms.add(content.slice(i, i + n).join(" "));

  const hits: Hit[] = [];
  for (const term of terms) {
    const hit = matchTerm(term, data);
    if (hit) hits.push(hit);
  }

  // A broad field ("databases", "frontend") is evidenced by the specific things that evidence it.
  const words = new Set(content.map(canonical));
  for (const field of FIELDS) {
    if (!field.triggers.some((t) => words.has(canonical(t)))) continue;
    for (const e of field.evidence) {
      const hit = matchTerm(e, data);
      if (hit) hits.push({ ...hit, strength: hit.strength });
    }
  }

  let status: FitStatus = hits.some((h) => h.strength === "evidenced") ? "evidenced" : hits.length ? "partial" : "none";
  const evidence = dedupe(hits.flatMap((h) => h.evidence))
    .sort((a, b) => Number(b.kind === "system") - Number(a.kind === "system"))
    .slice(0, options.maxEvidence);
  let note: string | null = null;

  // Honesty rule 1: years of experience are never evidenced beyond the years he has been building.
  const years = YEARS.exec(requirement);
  if (years && data.buildingSinceYear !== null) {
    const asked = Number(years[1]);
    const upTo = data.now.getUTCFullYear() - data.buildingSinceYear + 1;
    if (asked > upTo) {
      status = status === "none" ? "none" : "partial";
      note = options.yearsNote ? options.yearsNote.replaceAll("{years}", String(asked)).replaceAll("{since}", String(data.buildingSinceYear)) : null;
    }
  }

  // Honesty rule 2: seniority is not met by building alone.
  if (SENIORITY.test(requirement)) {
    status = hits.length && status !== "none" ? "partial" : "none";
    note = note ?? options.seniorityNote;
  }

  if (status === "none") note = note ?? options.noneNote;
  return { requirement, status, evidence: status === "none" ? [] : evidence, note };
}

/** Each need against the evidence, with the counts. Pure. */
export function fitCheck(requirements: string[], data: FitData, options: FitOptions): FitCardData {
  const rows = requirements.map(cleanRequirement).filter((r) => r.length >= 2).slice(0, options.maxRequirements).map((r) => matchRequirement(r, data, options));
  return {
    rows,
    evidenced: rows.filter((r) => r.status === "evidenced").length,
    partial: rows.filter((r) => r.status === "partial").length,
    none: rows.filter((r) => r.status === "none").length,
  };
}

// ---- the site's data ---------------------------------------------------------------------------

let memo: { at: number; value: Promise<FitData> } | null = null;

/** The evidence the site publishes, read through the public views; reused for a minute. */
export function loadFitData(now = new Date()): Promise<FitData> {
  if (memo && now.getTime() - memo.at < 60_000) return memo.value;
  const value = (async (): Promise<FitData> => {
    const [skills, systems, roles, study, profile] = await Promise.all([
      getSkillEvidence(),
      dbPublic.publicSystem.findMany({ select: { slug: true, name: true, techStack: true } }),
      dbPublic.publicExperience.findMany({ select: { title: true, organization: true, skills: true } }),
      dbPublic.publicEducation.findMany({ select: { qualification: true, coursework: true } }),
      dbPublic.publicProfile.findFirst({ select: { buildingSinceYear: true } }),
    ]);
    return {
      skills: skills.map((s) => ({ name: s.name, systemSlugs: s.systemSlugs, systemCount: Number(s.systemCount), roleCount: Number(s.roleCount), studyCount: Number(s.studyCount) })),
      systems: systems.map((s) => ({ slug: s.slug, name: s.name, tech: s.techStack })),
      roles,
      study,
      buildingSinceYear: profile?.buildingSinceYear ?? null,
      now,
    };
  })();
  memo = { at: now.getTime(), value };
  value.catch(() => {
    memo = null;
  });
  return value;
}
