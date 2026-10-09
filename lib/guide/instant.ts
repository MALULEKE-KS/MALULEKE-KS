// lib/guide/instant.ts
// The guide's instant lane (docs/AI-GUIDE-PHASE2-PLAN.md §3 A3). A few questions
// are pure site data — how to contact him, the CV, how many systems, the
// platform's live numbers. For these the model adds nothing but time and risk,
// so they are answered straight from the data: no model call, no spend, no
// request against the free models' limit, nothing to hallucinate, and an answer
// in milliseconds even while every model is busy.
//
// The router is deliberately strict. It matches only short, plain forms of the
// question; anything with a second clause, a "why", a "draft" or a name goes to
// the model, because a flat answer to a nuanced question is worse than a slow
// one. The reply wording is owner-edited content (the "guide-instant" block),
// filled in with live figures; when that block is missing the lane stays off
// and the model answers.

import type { UIMessageChunk } from "ai";
import type { GuideFacts } from "@/lib/guide/corpus";

export type InstantIntent = "contact" | "cv" | "counts" | "pulse";

export interface InstantTemplates {
  contact: string;
  contactEmail: string;
  cv: string;
  cvNone: string;
  counts: string;
  pulse: string;
}

const MAX_QUESTION = 90;

/** Lower-cased, punctuation-light, without politeness fillers — what the patterns see. */
export function normaliseQuestion(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[?!.,;:]+/g, " ")
    .replace(/\b(please|pls|kindly|hey|hi|hello|ok|okay|quick question|just|so|and)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const HIM = "(?: him| kurhula| the owner)?";
const PATTERNS: { intent: InstantIntent; patterns: RegExp[] }[] = [
  {
    intent: "contact",
    patterns: [
      new RegExp(`^(?:how|where) (?:do|can|could|would|should|might) (?:i|we) (?:contact|reach|get in touch with|email|message|write to|get hold of)${HIM}(?: directly)?$`),
      /^(?:how|where) (?:do|can|could) (?:i|we) get in touch$/,
      new RegExp(`^how to (?:contact|reach|email|message)${HIM}$`),
      /^(?:what is|what's|whats) (?:his|kurhula's) (?:email|email address|e-?mail|contact (?:details|info|information|form))$/,
      /^(?:his |kurhula's )?(?:email|email address|contact (?:details|info|information|form))$/,
      /^(?:contact|email|reach) (?:him|kurhula|details|info)$/,
    ],
  },
  {
    intent: "cv",
    patterns: [
      /^(?:can i |could i |how (?:do|can) i |where (?:do|can) i )?(?:download|get|see|view|find|have|grab)(?: a copy of)?(?: his| kurhula's| the| a)? (?:cv|resume|résumé|curriculum vitae)(?: pdf)?$/,
      /^(?:his |kurhula's |the )?(?:cv|resume|résumé|curriculum vitae)(?: pdf| download)?$/,
      /^(?:where is|where's|wheres) (?:his |kurhula's |the )?(?:cv|resume|résumé)$/,
    ],
  },
  {
    intent: "counts",
    patterns: [
      /^how many (?:systems|projects|repos|repositories|apps|products)(?: (?:has|did) (?:he|kurhula)(?: (?:built|build|made|published|created|shipped))?| does (?:he|kurhula) have| are there| are on this site)?(?: in total)?$/,
    ],
  },
  {
    intent: "pulse",
    patterns: [
      /^(?:what is|what's|whats|show(?: me)?) (?:the )?(?:platform|site|system)'?s? (?:status|pulse|health|stats|live numbers)$/,
      /^how many (?:business )?rules (?:does the (?:platform|site) enforce|are enforced)$/,
    ],
  },
];

/** Which instant answer a visitor's question asks for — or null when the model should answer. */
export function matchInstant(question: string): InstantIntent | null {
  if (question.length > MAX_QUESTION) return null;
  const q = normaliseQuestion(question);
  if (!q) return null;
  for (const { intent, patterns } of PATTERNS) if (patterns.some((p) => p.test(q))) return intent;
  return null;
}

// ---- the reply ---------------------------------------------------------------------------------

const plural = (n: number, noun: string) => `${n} ${noun}${n === 1 ? "" : "s"}`;

/** Fill {placeholders}; one left unfilled makes the whole reply unusable (null) rather than shown raw. */
export function fillTemplate(template: string, values: Record<string, string | number>): string | null {
  let missing = false;
  const text = template.replace(/\{(\w+)\}/g, (_, key: string) => {
    if (!(key in values)) {
      missing = true;
      return "";
    }
    return String(values[key]);
  });
  return missing ? null : text.replace(/[ \t]+/g, " ").replace(/ +([.,;:])/g, "$1").trim();
}

export interface InstantReply {
  intent: InstantIntent;
  text: string;
  /** Tool cards to show beside the text (names as in the card tools). */
  cards: "show_pulse"[];
}

/** The reply for an intent, from the live facts and the owner's templates; null when it can't be built honestly. */
export function buildInstant(intent: InstantIntent, facts: GuideFacts, ownerFirstName: string, templates: InstantTemplates): InstantReply | null {
  const owner = ownerFirstName;
  switch (intent) {
    case "contact": {
      const text = facts.email
        ? fillTemplate(templates.contactEmail, { owner, reviewSlaHours: facts.reviewSlaHours, email: facts.email })
        : fillTemplate(templates.contact, { owner, reviewSlaHours: facts.reviewSlaHours });
      return text ? { intent, text, cards: [] } : null;
    }
    case "cv": {
      const options = facts.cv.map((o) => `${o.label} (${o.formats.join(", ")})`).join("; ");
      const text = facts.cv.length ? fillTemplate(templates.cv, { owner, cvOptions: options }) : fillTemplate(templates.cvNone, { owner });
      return text ? { intent, text, cards: [] } : null;
    }
    case "counts": {
      const { total, privateCount, byStatus } = facts.systems;
      if (total === 0) return null; // nothing published: let the model say so in its own words
      const breakdown = byStatus.map((s) => `${s.count} ${s.status.toLowerCase()}`).join(", ");
      const privateNote = privateCount > 0 ? `${plural(privateCount, "system")} ${privateCount === 1 ? "keeps its" : "keep their"} code in ${privateCount === 1 ? "a private repository" : "private repositories"}.` : "";
      const text = fillTemplate(templates.counts, { owner, systems: plural(total, "system"), breakdown, privateNote });
      return text ? { intent, text, cards: [] } : null;
    }
    case "pulse": {
      const p = facts.pulse;
      const text = fillTemplate(templates.pulse, { owner, rules: p.rulesEnforcedByDatabase, audited7: p.auditEventsLast7Days, auditedTotal: p.auditEventsTotal });
      return text ? { intent, text, cards: ["show_pulse"] } : null;
    }
  }
}

/**
 * The reply as a UI message stream — the same protocol a model answer uses, so the
 * chat renders it, its cards and its sources exactly as it does any answer.
 * `cardOutputs` carries each card tool's server-built output.
 */
export function instantChunks(reply: InstantReply, cardOutputs: Partial<Record<"show_pulse", unknown>>): UIMessageChunk[] {
  const chunks: UIMessageChunk[] = [{ type: "start" }];
  for (const card of reply.cards) {
    if (cardOutputs[card] === undefined) continue;
    const toolCallId = `instant-${card}`;
    chunks.push({ type: "tool-input-available", toolCallId, toolName: card, input: {} });
    chunks.push({ type: "tool-output-available", toolCallId, output: cardOutputs[card] });
  }
  chunks.push({ type: "text-start", id: "instant" }, { type: "text-delta", id: "instant", delta: reply.text }, { type: "text-end", id: "instant" }, { type: "finish", finishReason: "stop" });
  return chunks;
}
