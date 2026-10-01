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
import { parseGuideRequest } from "@/lib/guide/request";
import { searchPublic } from "@/lib/queries/search";
import { guideModel, guideProviderConfigured } from "@/lib/guide/model";

export const maxDuration = 60;

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export async function POST(request: Request) {
  const flags = await getFlags();
  if (flags[FLAGS.concierge] !== true) return errorResponse("GUIDE_OFF", "The AI guide is switched off.", 404);
  if (!guideProviderConfigured()) return errorResponse("GUIDE_UNAVAILABLE", "The AI guide is resting right now.", 503);

  const [model, maxMessagesPerConversation, maxQuestionCharacters, perVisitor, windowHours, dailyCap, maxAnswerTokens, budget] = await Promise.all([
    getSetting("concierge.model"),
    getSetting("concierge.maxMessagesPerConversation"),
    getSetting("concierge.maxQuestionCharacters"),
    getSetting("concierge.rateLimit.maxPerWindow"),
    getSetting("concierge.rateLimit.windowHours"),
    getSetting("concierge.dailyMessageCap"),
    getSetting("concierge.maxAnswerTokens"),
    getSetting("concierge.contextBudgetTokens"),
  ]);

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
      return errorResponse("RATE_LIMITED", "That's a lot of questions — the guide needs a breather. Try again later, or write to him directly.", 429, { retryAfterMs: visitor.retryAfterMs });
    }
  }
  const everyone = await hitRateLimitKey("guide:all", dailyCap, 24 * 60 * 60 * 1000);
  if (!everyone.allowed) {
    return errorResponse("GUIDE_RESTING", "The guide is resting until tomorrow — the contact form reaches him directly.", 429, { retryAfterMs: everyone.retryAfterMs });
  }

  const corpus = await getGuideCorpus(budget);
  // The lens framing is the owner's private instruction — read with the runtime role, never shown.
  const lens = parsed.lens ? await db.visitorLens.findUnique({ where: { key: parsed.lens }, select: { aiFramingPrompt: true } }) : null;

  const on = {
    openPage: flags[FLAGS.openPage] === true,
    searchSystems: flags[FLAGS.searchSystems] === true,
    draftInquiry: flags[FLAGS.draftInquiry] === true,
  };
  const tools: ToolSet = {};
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
          path: r.kind === "system" ? `/systems/${r.key}` : r.kind === "journey" ? "/journey" : "/cv",
        })),
    };
  }
  if (on.draftInquiry) {
    tools.draft_inquiry = {
      description: "Fill the contact form with a draft for the visitor to review and send themselves. Never sends anything.",
      inputSchema: z.object({
        message: z.string().min(20).max(2000).describe("The visitor's message, in their words, ready to edit"),
      }),
      // No execute: the browser fills the form; the visitor sends it (BR-4.1/4.2).
    };
  }

  const result = streamText({
    model: guideModel(model),
    instructions: {
      role: "system",
      content: buildInstructions({ corpus, lensFraming: lens?.aiFramingPrompt ?? null, tools: on, today: new Date().toISOString().slice(0, 10) }),
      // The instructions and knowledge are identical for every visitor — cache them.
      providerOptions: { anthropic: { cacheControl: { type: "ephemeral" } } },
    },
    messages: await convertToModelMessages(parsed.messages),
    tools,
    stopWhen: isStepCount(4),
    maxOutputTokens: maxAnswerTokens,
    abortSignal: request.signal,
  });

  return createUIMessageStreamResponse({
    stream: toUIMessageStream({
      stream: result.stream,
      tools,
      // Never leak provider errors to the browser.
      onError: () => "The guide lost its train of thought — try again in a moment.",
    }),
  });
}
