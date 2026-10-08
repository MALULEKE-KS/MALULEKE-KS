// POST /api/v1/guide — the AI guide (PUBLIC-REDESIGN-PLAN §3a, Constitution §6).
// Streams an answer grounded in the site's public data. See openapi-contract.yaml.
//
// Defence in layers, in order:
//   1. The concierge flag (BR-4.4) — off means the guide doesn't exist.
//   2. A strict request whitelist (lib/guide/request.ts) and the owner's bounds:
//      question length, questions per conversation.
//   3. Rate limits in the database (BR-2.4 style): per visitor, and a daily
//      cap across every visitor — the spending cap. Past either, the guide
//      rests and the chat offers the contact form.
//   4. Standing instructions (lib/guide/prompt.ts) that treat everything a
//      visitor writes as conversation, never as instructions.
//   5. Tools that only read, each behind its own flag; open_page accepts only
//      the site's own paths; draft_inquiry only fills the form for the
//      visitor to send (BR-4.1/4.2).

import { NextResponse } from "next/server";
import { convertToModelMessages, createUIMessageStreamResponse, isStepCount, streamText, toUIMessageStream, type ToolSet } from "ai";
import { z } from "zod";
import { db } from "@/lib/db";
import { FLAGS, getFlags } from "@/lib/flags";
import { getSetting } from "@/lib/settings";
import { hitRateLimit, hitRateLimitKey } from "@/lib/auth/rate-limit";
import { getGuideCorpus } from "@/lib/guide/corpus";
import { buildInstructions } from "@/lib/guide/prompt";
import { showJourney, showPulse, showSkills, showSystems } from "@/lib/guide/show-tools";
import { backIn, parseGuideRequest } from "@/lib/guide/request";
import { searchPublic } from "@/lib/queries/search";
import { getInquiryTypes } from "@/lib/queries/site";
import { guideModel, guideProviderConfigured } from "@/lib/guide/model";
import { liveGatewayModels, pickModels } from "@/lib/guide/gateway-models";

export const maxDuration = 60;

const BUSY_MESSAGE = "A lot of people are talking to the guide right now — give it a minute and try again.";

/** The model (and every fallback) is rate-limited or overloaded — not a fault, just busy. */
function isBusy(error: unknown): boolean {
  for (let e: unknown = error, depth = 0; e && depth < 4; depth++) {
    const x = e as { name?: string; statusCode?: number; type?: string; lastError?: unknown; cause?: unknown };
    if (x.statusCode === 429 || x.statusCode === 529 || /RateLimit/i.test(x.name ?? "") || /rate_limit|overloaded/i.test(x.type ?? "")) return true;
    e = x.lastError ?? x.cause;
  }
  return false;
}

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export async function POST(request: Request) {
  const flags = await getFlags();
  if (flags[FLAGS.concierge] !== true) return errorResponse("GUIDE_OFF", "The AI guide is switched off.", 404);
  if (!guideProviderConfigured()) return errorResponse("GUIDE_UNAVAILABLE", "The AI guide is resting right now.", 503);

  const [configuredModel, maxMessagesPerConversation, maxQuestionCharacters, perVisitor, windowHours, dailyCap, maxAnswerTokens, budget, cacheSeconds, fallbackSetting, maxReasoningTokens] = await Promise.all([
    getSetting("concierge.model"),
    getSetting("concierge.maxMessagesPerConversation"),
    getSetting("concierge.maxQuestionCharacters"),
    getSetting("concierge.rateLimit.maxPerWindow"),
    getSetting("concierge.rateLimit.windowHours"),
    getSetting("concierge.dailyMessageCap"),
    getSetting("concierge.maxAnswerTokens"),
    getSetting("concierge.contextBudgetTokens"),
    getSetting("concierge.corpusCacheSeconds"),
    getSetting("concierge.fallbackModels"),
    getSetting("concierge.maxReasoningTokens"),
  ]);
  // Never a model the gateway has retired (a free tier ending broke every fallback answer, 2026-10-08).
  const { model, fallbacks } = pickModels(
    configuredModel,
    fallbackSetting
      .split(",")
      .map((m) => m.trim())
      .filter((m) => m && m !== configuredModel),
    await liveGatewayModels(),
  );

  const body = await request.json().catch(() => null);
  const parsed = parseGuideRequest(body, { maxMessagesPerConversation, maxQuestionCharacters });
  if (!parsed.ok) {
    const status = parsed.problem.code === "CONVERSATION_LIMIT" ? 429 : 400;
    return errorResponse(parsed.problem.code, parsed.problem.message, status);
  }

  // A new question counts against the visitor; every model call counts against the daily cap.
  if (parsed.isNewQuestion) {
    const visitor = await hitRateLimit("guide", request, perVisitor, windowHours * 60 * 60 * 1000);
    if (!visitor.allowed) {
      return errorResponse(
        "RATE_LIMITED",
        `You've used all your questions for now, so the guide is resting. Your questions come back ${backIn(visitor.retryAfterMs ?? windowHours * 60 * 60 * 1000)} — meanwhile the contact form reaches him directly.`,
        429,
        { retryAfterMs: visitor.retryAfterMs },
      );
    }
  }
  const everyone = await hitRateLimitKey("guide:all", dailyCap, 24 * 60 * 60 * 1000);
  if (!everyone.allowed) {
    return errorResponse(
      "GUIDE_RESTING",
      `The guide has given every answer it has for today and is resting. Answers are available again ${backIn(everyone.retryAfterMs ?? 24 * 60 * 60 * 1000)} — meanwhile the contact form reaches him directly.`,
      429,
      { retryAfterMs: everyone.retryAfterMs },
    );
  }

  const [corpus, inquiryTypes] = await Promise.all([getGuideCorpus(budget, cacheSeconds), getInquiryTypes()]);
  // Where the visitor is: one of the site's own pages, or nothing ("this system" means the one they're reading).
  const page = parsed.page && corpus.paths.includes(parsed.page) ? parsed.page : null;
  // The lens framing is the owner's private instruction — read with the runtime role, never shown.
  const lens = parsed.lens ? await db.visitorLens.findUnique({ where: { key: parsed.lens }, select: { aiFramingPrompt: true } }) : null;

  const on = {
    openPage: flags[FLAGS.openPage] === true,
    searchSystems: flags[FLAGS.searchSystems] === true,
    draftInquiry: flags[FLAGS.draftInquiry] === true,
    showSystems: flags[FLAGS.showSystems] === true,
    showJourney: flags[FLAGS.showJourney] === true,
    showSkills: flags[FLAGS.showSkills] === true,
    showPulse: flags[FLAGS.showPulse] === true,
  };
  const tools: ToolSet = {};
  // The card tools (docs/AI-GUIDE-PHASE1-PLAN.md §7): the model picks which records; the cards are read
  // from the public views here, so they show exactly what the site does. Unknown keys are dropped.
  const systemSlugs = corpus.paths.flatMap((p) => (/^\/systems\/[a-z0-9-]+$/.test(p) ? [p.slice("/systems/".length)] : []));
  if (on.showSystems && systemSlugs.length > 0) {
    tools.show_systems = {
      description: "Show live cards for 1–4 of his published systems (status, stack, last activity) beside your answer, whenever you talk about specific systems.",
      inputSchema: z.object({ slugs: z.array(z.enum(systemSlugs as [string, ...string[]])).min(1).max(4) }),
      execute: async ({ slugs }: { slugs: string[] }) => showSystems(slugs),
    };
  }
  if (on.showJourney) {
    const year = z.number().int().min(1990).max(2100);
    tools.show_journey = {
      description: "Show his journey between two years (inclusive) as a timeline card, when you talk about when things happened.",
      inputSchema: z.object({ from: year, to: year }),
      execute: async ({ from, to }: { from: number; to: number }) => showJourney(from, to),
    };
  }
  if (on.showSkills) {
    tools.show_skills = {
      description: "Show 1–6 skills, each with the published systems that prove it, when you talk about what he can do.",
      inputSchema: z.object({ names: z.array(z.string().min(1).max(60)).min(1).max(6) }),
      execute: async ({ names }: { names: string[] }) => showSkills(names),
    };
  }
  if (on.showPulse) {
    tools.show_pulse = {
      description: "Show this site's live pulse — business rules enforced by its database, audited changes, the last GitHub sync — when you talk about how this platform is built or enforced.",
      inputSchema: z.object({}),
      execute: async () => showPulse(),
    };
  }
  if (on.openPage) {
    tools.open_page = {
      description: "Open a page on this site for the visitor, optionally scrolling to a section. Only the site's own paths.",
      inputSchema: z.object({
        path: z.enum(corpus.paths as [string, ...string[]]),
        section: z.string().max(60).optional().describe("A section heading on that page, if relevant"),
      }),
      // No execute: the browser navigates (a client-side tool).
    };
  }
  if (on.searchSystems) {
    tools.search_systems = {
      description: "Search the published systems, journey entries and skills on this site.",
      inputSchema: z.object({ query: z.string().min(2).max(100) }),
      execute: async ({ query }: { query: string }) =>
        (await searchPublic(query, 6)).map((r) => ({
          kind: r.kind,
          title: r.title,
          subtitle: r.subtitle,
          path: r.kind === "system" ? `/systems/${r.key}` : r.kind === "journey" ? `/journey#entry-${r.key}` : "/about#skills",
        })),
    };
  }
  if (on.draftInquiry) {
    const categories = inquiryTypes.map((t) => t.value);
    tools.draft_inquiry = {
      description: "Fill the contact form with a draft for the visitor to review and send themselves, opened on the right kind of message. Never sends anything.",
      inputSchema: z.object({
        message: z.string().min(20).max(2000).describe("The visitor's message, in their words, ready to edit"),
        ...(categories.length > 0 && {
          category: z
            .enum(categories as [string, ...string[]])
            .optional()
            .describe("What it's about — the contact form's kind of message, when it's clear"),
        }),
      }),
      // No execute: the browser fills the form; the visitor sends it (BR-4.1/4.2).
    };
  }

  const result = streamText({
    model: guideModel(model),
    instructions: [
      {
        role: "system",
        content: buildInstructions({ corpus, lensFraming: lens?.aiFramingPrompt ?? null, tools: on, today: new Date().toISOString().slice(0, 10) }),
        // The instructions and knowledge are identical for every visitor — cache them.
        providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } },
      },
      // Per-visitor context goes after the cached part, so the cache still hits. Built here from a
      // validated site path — never visitor text (system messages stay out of `messages`).
      ...(page ? [{ role: "system" as const, content: `The visitor is reading ${page} right now — "this", "this page" or "this system" means that one.` }] : []),
    ],
    messages: await convertToModelMessages(parsed.messages),
    tools,
    stopWhen: isStepCount(4),
    // A reasoning model's thinking counts as output: give it its own allowance, or the answer is what gets cut.
    maxOutputTokens: maxAnswerTokens + maxReasoningTokens,
    abortSignal: request.signal,
    providerOptions: {
      // Busy or down → the next model on the owner's list; caching where the provider supports it.
      gateway: { ...(fallbacks.length > 0 && { models: fallbacks }), caching: "auto", tags: ["guide"] },
    },
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      tools,
      // The chat says when an answer was cut short, instead of ending mid-sentence in silence.
      messageMetadata: ({ part }) => (part.type === "finish" ? { finishReason: part.finishReason } : undefined),
      // Never leak provider errors to the browser — but say honestly when it's just busy.
      onError: (error) => (isBusy(error) ? BUSY_MESSAGE : "The guide lost its train of thought — try again in a moment."),
    }),
  });
}
