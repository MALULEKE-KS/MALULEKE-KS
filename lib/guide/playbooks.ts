// lib/guide/playbooks.ts
// Question playbooks (docs/AI-GUIDE-PHASE2-PLAN.md §5 C1). Different questions want
// different thinking: a hiring question wants evidence, mapped and honest; a
// comparison wants two things side by side; a depth question wants the mechanism;
// a question about time wants dates worked out in code. Instead of one long
// paragraph of method for every turn, the standing instructions stay short and
// each turn gets the one short playbook that fits — chosen here, deterministically,
// from the question and the site's own names, and made of fixed text (never the
// visitor's words). A question that fits none gets no playbook.

export type PlaybookKind = "fit" | "compare" | "timeline" | "depth" | "general" | "smalltalk";

export interface PlaybookInput {
  question: string;
  /** The page the visitor is on, when it is one of the site's own. */
  page: string | null;
  /** Names of his systems, as the site spells them. */
  systemNames: string[];
  tools: { fitCheck: boolean; compareSystems: boolean };
}

export interface Playbook {
  kind: PlaybookKind;
  instruction: string;
}

const OWNER = /\b(he|his|him|himself|kurhula|the owner|this (?:site|platform|system|page|project)|the platform|who built you|your (?:creator|owner|maker))\b/i;
const FIT = /\b(good fit|a fit|fit for|hire|hiring|recruit\w*|candidate|job description|job spec|vacancy|requirements?|we need|we(?:'re| are) looking for|looking for an?|qualif\w+|suitable|role|position|internship|graduate programme|interview)\b/i;
const JD_SIGNS = /\b(responsibilities|requirements|qualifications|must[- ]have|nice[- ]to[- ]have|about the role|what you(?:'ll| will) do|years of experience|we offer|apply)\b/gi;
const COMPARE = /\b(compare|comparison|versus|vs\.?|difference between|differences between|which is better|how do(?:es)? .+ differ)\b/i;
const TIMELINE = /\b(lately|recent(?:ly)?|this week|this month|this year|latest|what'?s new|journey|history|timeline|when did|how long|since when|growing|started|first project)\b/i;
const DEPTH = /\b(how (?:does|do|did|is|was)|why (?:did|does|is|was|would)|architecture|under the hood|internals|trade-?offs?|design decisions?|technically|implement\w*|how .+ work)\b/i;
const SMALLTALK = /^(?:hi|hello|hey|howzit|sawubona|thanks|thank you|cool|nice|ok|okay|lol|great|wow)\b/i;

const mentionsSystem = (question: string, names: string[]) => names.filter((n) => n.length > 2 && question.toLowerCase().includes(n.toLowerCase()));

export function decidePlaybook({ question, page, systemNames, tools }: PlaybookInput): Playbook | null {
  const q = question.trim();
  if (!q) return null;
  const named = mentionsSystem(q, systemNames);
  const aboutHim = OWNER.test(q) || named.length > 0 || (page !== null && page.startsWith("/systems/"));
  const jobLike = (q.match(JD_SIGNS)?.length ?? 0) >= 2 || (q.length > 350 && FIT.test(q));

  if (jobLike || (FIT.test(q) && aboutHim)) {
    return {
      kind: "fit",
      instruction: `This is a fit question. Gather the specific evidence for each need from the knowledge — systems, skills, roles, studies — and say plainly what is evidenced and what isn't yet. Lead with the strongest real match; never inflate seniority or years.${
        tools.fitCheck ? " If the visitor shares a job description or a list of needs, call fit_check with the needs (short phrases) so they see each one mapped against the evidence, then comment on it in a few sentences — do not repeat the card." : ""
      }`,
    };
  }
  if (COMPARE.test(q) && (named.length >= 2 || (named.length >= 1 && page?.startsWith("/systems/")))) {
    return {
      kind: "compare",
      instruction: `This is a comparison.${tools.compareSystems ? " Call compare_systems with the two systems so they appear side by side, then" : " Put the two side by side, then"} give the one difference that matters most and the one thing they share. Only facts from the knowledge.`,
    };
  }
  if (TIMELINE.test(q) && aboutHim) {
    return {
      kind: "timeline",
      instruction: "This question is about time. Use the durations already written in the knowledge (\"3 days ago\", \"1 year, 8 months\") — never subtract dates yourself. Lead with the most recent thing, and name dates and repositories.",
    };
  }
  if (DEPTH.test(q) && aboutHim) {
    return {
      kind: "depth",
      instruction: "This is a depth question. Answer like an engineer: the mechanism first, then why it was built that way, then where a visitor can verify it (a page path). Keep what the site says apart from general knowledge.",
    };
  }
  if (SMALLTALK.test(q) && q.length < 40) {
    return { kind: "smalltalk", instruction: "This is small talk. Reply warmly and briefly, then offer one useful thing to ask or see." };
  }
  if (!aboutHim) {
    return {
      kind: "general",
      instruction: "This is a general question. Answer it on its merits, properly and with personality; make a natural connection to Kurhula's work only if one really exists — never force it. Say so when you're not sure.",
    };
  }
  return null;
}
