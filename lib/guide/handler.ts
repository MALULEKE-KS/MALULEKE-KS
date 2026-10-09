// lib/guide/handler.ts
// The AI guide's request handling (PUBLIC-REDESIGN-PLAN §3a, Constitution §6),
// behind POST /api/v1/guide (app/api/v1/guide/route.ts) and the daily canary
// (lib/guide/canary.ts) — both go through the same pipeline, so the canary
// really tests what a visitor gets. Streams an answer grounded in the site's
// public data. See openapi-contract.yaml.
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
import { convertToModelMessages, createUIMessageStreamResponse, isStepCount, streamText, toUIMessageStream, type ToolSet, type UIMessageChunk } from "ai";
import { z } from "zod";
import { db } from "@/lib/db";
import { FLAGS, getFlags } from "@/lib/flags";
import { getSetting } from "@/lib/settings";
import { hitRateLimit, hitRateLimitKey } from "@/lib/auth/rate-limit";
import { getGuideCorpus } from "@/lib/guide/corpus";
import { buildInstructions } from "@/lib/guide/prompt";
import { compareSystems, showJourney, showPulse, showSkills, showSystems } from "@/lib/guide/show-tools";
import { fitCheck, loadFitData, type FitOptions } from "@/lib/guide/fit";
import { decidePlaybook } from "@/lib/guide/playbooks";
import { resolveTour, tourKeys, ToursBlock } from "@/lib/guide/tour";
import { backIn, parseGuideRequest } from "@/lib/guide/request";
import { searchPublic } from "@/lib/queries/search";
import { getInquiryTypes } from "@/lib/queries/site";
import { guideModel, guideProviderConfigured } from "@/lib/guide/model";
import { liveGatewayModels, pickModels } from "@/lib/guide/gateway-models";
import { recordGuideTurn, startTurnTimer, type GuideTurnRecord } from "@/lib/guide/telemetry";
import { buildInstant, instantChunks, matchInstant } from "@/lib/guide/instant";
import { decideTone, toneInstruction } from "@/lib/guide/tone";
import { verifyAnswer, type Verification } from "@/lib/guide/verify";
import { looksUnanswered, recordGap } from "@/lib/guide/gaps";
import { getContentBlock } from "@/lib/content/blocks";
import { waitUntil } from "@vercel/functions";

const BUSY_MESSAGE = "A lot of people are talking to the guide right now — give it a minute and try again.";

/** The model (and every fallback) is rate-limited, overloaded or briefly down (503) — not a fault, just busy. */
function isBusy(error: unknown): boolean {
  for (let e: unknown = error, depth = 0; e && depth < 4; depth++) {
    const x = e as { name?: string; statusCode?: number; type?: string; lastError?: unknown; cause?: unknown };
    if (x.statusCode === 429 || x.statusCode === 503 || x.statusCode === 529 || /RateLimit/i.test(x.name ?? "") || /rate_limit|overloaded/i.test(x.type ?? "")) return true;
    // A retry error carries every attempt; busy if the last one was.
    e = x.lastError ?? x.cause;
  }
  return false;
}

function errorResponse(code: string, message: string, status: number, details?: object) {
  return NextResponse.json({ error: { code, message, details: details ?? null } }, { status });
}

export type GuideSource = "visitor" | "canary";

export async function handleGuideRequest(request: Request, source: GuideSource = "visitor"): Promise<Response> {
  const track = (rec: GuideTurnRecord) => waitUntil(recordGuideTurn({ ...rec, source }));
  const timer = startTurnTimer();
  const flags = await getFlags();
  if (flags[FLAGS.concierge] !== true) return errorResponse("GUIDE_OFF", "The AI guide is switched off.", 404);

  const [configuredModel, maxMessagesPerConversation, maxQuestionCharacters, perVisitor, windowHours, dailyCap, maxAnswerTokens, budget, cacheSeconds, fallbackSetting, maxReasoningTokens, firstTokenDeadlineMs, humorCeiling, humorEveryNth, humorCoolDown, instantMaxCharacters, verifierMaxFlagged, fitMaxRequirements, fitMaxEvidence] = await Promise.all([
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
    getSetting("concierge.firstTokenDeadlineMs"),
    getSetting("concierge.humor"),
    getSetting("concierge.humor.everyNthTurn"),
    getSetting("concierge.humor.coolDownTurns"),
    getSetting("concierge.instant.maxQuestionCharacters"),
    getSetting("concierge.verifier.maxFlagged"),
    getSetting("concierge.fit.maxRequirements"),
    getSetting("concierge.fit.maxEvidence"),
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

  // The instant lane (docs/AI-GUIDE-PHASE2-PLAN.md §3 A3): questions that are pure site data are answered from
  // the data with no model — before any limit is spent and even while no model is available.
  if (parsed.isNewQuestion && flags[FLAGS.instantLane] === true) {
    const last = parsed.messages[parsed.messages.length - 1]!;
    const question = last.parts.find((p): p is { type: "text"; text: string } => p.type === "text")?.text ?? "";
    const intent = matchInstant(question, instantMaxCharacters);
    if (intent) {
      const [instantCorpus, templates] = await Promise.all([getGuideCorpus(budget, cacheSeconds), getContentBlock("guide-instant")]);
      const reply = templates ? buildInstant(intent, instantCorpus.facts, instantCorpus.ownerFirstName, templates) : null;
      if (reply) {
        const cardOutputs = reply.cards.includes("show_pulse") && flags[FLAGS.showPulse] === true ? { show_pulse: await showPulse() } : {};
        track({ outcome: "instant", totalMs: timer.elapsed(), firstTokenMs: timer.elapsed(), tools: Object.keys(cardOutputs), finishReason: "stop" });
        const chunks = instantChunks(reply, cardOutputs);
        return createUIMessageStreamResponse({
          stream: new ReadableStream<UIMessageChunk>({
            start(controller) {
              for (const chunk of chunks) controller.enqueue(chunk);
              controller.close();
            },
          }),
        });
      }
    }
  }

  // Everything below needs a model.
  if (!guideProviderConfigured()) {
    track({ outcome: "resting", totalMs: timer.elapsed() });
    return errorResponse("GUIDE_UNAVAILABLE", "The AI guide is resting right now.", 503);
  }

  // A new question counts against the visitor; every model call counts against the daily cap.
  if (parsed.isNewQuestion) {
    const visitor = await hitRateLimit("guide", request, perVisitor, windowHours * 60 * 60 * 1000);
    if (!visitor.allowed) {
      track({ outcome: "limited", configuredModel: model, totalMs: timer.elapsed() });
      return errorResponse(
        "RATE_LIMITED",
        `This device has used all ${perVisitor} of its answers for now — that's the limit. Answers come back ${backIn(visitor.retryAfterMs ?? windowHours * 60 * 60 * 1000)}; meanwhile the contact form reaches him directly.`,
        429,
        // The browser says *when*, in the visitor's own time zone.
        { retryAfterMs: visitor.retryAfterMs, limit: perVisitor, resetsAt: new Date(Date.now() + (visitor.retryAfterMs ?? windowHours * 60 * 60 * 1000)).toISOString() },
      );
    }
  }
  const everyone = await hitRateLimitKey("guide:all", dailyCap, 24 * 60 * 60 * 1000);
  if (!everyone.allowed) {
    track({ outcome: "resting", configuredModel: model, totalMs: timer.elapsed() });
    return errorResponse(
      "GUIDE_RESTING",
      `The guide has given every answer it has for today and is resting. Answers are available again ${backIn(everyone.retryAfterMs ?? 24 * 60 * 60 * 1000)} — meanwhile the contact form reaches him directly.`,
      429,
      { retryAfterMs: everyone.retryAfterMs, limit: dailyCap, resetsAt: new Date(Date.now() + (everyone.retryAfterMs ?? 24 * 60 * 60 * 1000)).toISOString() },
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
    compareSystems: flags[FLAGS.compareSystems] === true,
    fitCheck: flags[FLAGS.fitCheck] === true,
    tour: flags[FLAGS.tour] === true,
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
  if (on.compareSystems && systemSlugs.length >= 2) {
    const slug = z.enum(systemSlugs as [string, ...string[]]);
    tools.compare_systems = {
      description: "Put two of his published systems side by side — status, what each is, which technologies they share and which are only in one — when the visitor asks to compare or contrast them.",
      inputSchema: z.object({ left: slug, right: slug }),
      execute: async ({ left, right }: { left: string; right: string }) => compareSystems(left, right),
    };
  }
  if (on.fitCheck) {
    // The limits are settings and the notes' wording is the owner's content ("guide-fit"); the matching is code.
    const notes = await getContentBlock("guide-fit");
    const fitOptions: FitOptions = {
      maxRequirements: fitMaxRequirements,
      maxEvidence: fitMaxEvidence,
      yearsNote: notes?.yearsNote || null,
      seniorityNote: notes?.seniorityNote || null,
      noneNote: notes?.noneNote || null,
    };
    tools.fit_check = {
      description:
        "Map a visitor's needs — a job description's requirements, or the skills they're looking for — against the evidence on this site. Give each need as a short phrase (\"TypeScript\", \"5 years of Kubernetes\", \"experience leading a team\"), at most 8. The card shows each as evidenced, partly, or not evidenced yet, with the systems that prove it; matching is done in code from the site's data, so list the needs faithfully and never soften or sharpen them.",
      inputSchema: z.object({ requirements: z.array(z.string().min(2).max(160)).min(1).max(fitMaxRequirements) }),
      execute: async ({ requirements }: { requirements: string[] }) => fitCheck(requirements, await loadFitData(), fitOptions),
    };
  }
  if (on.tour) {
    // The tours are the owner's content; the model chooses a key, nothing else.
    const parsedTours = ToursBlock.safeParse((await db.siteContent.findUnique({ where: { key: "guide-tours" }, select: { body: true } }))?.body);
    const block = parsedTours.success ? parsedTours.data : null;
    const keys = tourKeys(block);
    if (block && keys.length > 0) {
      tools.start_tour = {
        description: `Start one of the owner's guided tours of this site. Tours: ${block.tours.map((t) => `${t.key} (${t.summary})`).join("; ")}.`,
        inputSchema: z.object({ tour: z.enum(keys as [string, ...string[]]) }),
        execute: async ({ tour }: { tour: string }) => resolveTour(block, tour, corpus.paths),
      };
    }
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

  // How much wit this reply may carry — decided here from the conversation, never left to the model's mood
  // (docs/AI-GUIDE-PHASE2-PLAN.md §6). A tool's follow-up request has the same last question, so the same answer.
  const userTexts = parsed.messages.filter((m) => m.role === "user").map((m) => m.parts.find((p): p is { type: "text"; text: string } => p.type === "text")?.text ?? "");
  const tone = decideTone({ question: userTexts[userTexts.length - 1] ?? "", earlier: userTexts.slice(0, -1), turn: userTexts.length, ceiling: humorCeiling, everyNthTurn: humorEveryNth, coolDownTurns: humorCoolDown });

  // What the guide said, checked against the site's data once it has finished (lib/guide/verify.ts) —
  // a count and a list of what it could not find, shown with the answer and kept as numbers only.
  const lastQuestion = userTexts[userTexts.length - 1] ?? "";
  let answerText = "";
  let verification: Verification | null = null;
  const verifyOnce = (): Verification => {
    if (verification) return verification;
    verification = verifyAnswer({ answer: answerText, question: lastQuestion, corpus, maxFlagged: verifierMaxFlagged });
    // A question the site couldn't answer (or the guide answered beyond the site's data) is kept for the owner — scrubbed, if
    // allowed. The nightly self-check's own fixed questions are not visitors' and never go in that log.
    if (source === "visitor") {
      if (looksUnanswered(answerText)) waitUntil(recordGap({ question: lastQuestion, reason: "unanswered", page }));
      else if (verification.flagged.length > 0) waitUntil(recordGap({ question: lastQuestion, reason: "unverified", page }));
    }
    return verification;
  };

  // The playbook for this kind of question: fixed guidance, chosen from the question and the site's own names.
  const playbook = decidePlaybook({
    question: lastQuestion,
    page,
    systemNames: [...corpus.text.matchAll(/^### (.+?) \(source: \/systems\//gm)].map((m) => m[1]!),
    tools: { fitCheck: on.fitCheck, compareSystems: on.compareSystems },
  });

  // One metrics row per answer, written exactly once however the stream ends (done, abort, error).
  const toolsRun: string[] = [];
  let written = false;
  const write = (rec: Omit<GuideTurnRecord, "configuredModel" | "totalMs" | "firstTokenMs" | "tools">) => {
    if (written) return;
    written = true;
    const v = rec.outcome === "answered" ? verifyOnce() : null;
    track({
      ...rec,
      configuredModel: model,
      totalMs: timer.elapsed(),
      firstTokenMs: timer.firstTokenMs,
      tools: toolsRun,
      humor: tone.humor,
      ...(v && { verifierChecked: v.checked, verifierFlagged: v.flagged.length, flaggedKinds: [...new Set(v.flagged.map((f) => f.kind))] }),
    });
  };

  const result = streamText({
    model: guideModel(model, { fallbacks, firstTokenDeadlineMs }),
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
      // The tone for this reply, from fixed text keyed on the governor's decision — never visitor text.
      { role: "system" as const, content: toneInstruction(tone) },
      ...(playbook ? [{ role: "system" as const, content: playbook.instruction }] : []),
    ],
    messages: await convertToModelMessages(parsed.messages),
    tools,
    stopWhen: isStepCount(4),
    // A reasoning model's thinking counts as output: give it its own allowance, or the answer is what gets cut.
    maxOutputTokens: maxAnswerTokens + maxReasoningTokens,
    abortSignal: request.signal,
    onChunk: ({ chunk }) => {
      if (chunk.type === "text-delta") {
        timer.firstToken();
        answerText += chunk.text;
      } else if (chunk.type === "tool-call") toolsRun.push(chunk.toolName);
    },
    onEnd: (event) => {
      const last = event.steps[event.steps.length - 1];
      write({
        outcome: "answered",
        servedModel: last?.response?.modelId ?? null,
        inputTokens: event.totalUsage.inputTokens,
        outputTokens: event.totalUsage.outputTokens,
        reasoningTokens: event.totalUsage.outputTokenDetails?.reasoningTokens,
        cachedTokens: event.totalUsage.inputTokenDetails?.cacheReadTokens,
        steps: event.steps.length,
        finishReason: event.finishReason,
        route: event.providerMetadata?.gateway,
      });
    },
    onAbort: () => write({ outcome: "aborted" }),
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
      messageMetadata: ({ part }) => (part.type === "finish" ? { finishReason: part.finishReason, tone: tone.mood, verification: verifyOnce() } : undefined),
      // Never leak provider errors to the browser — but say honestly when it's just busy.
      onError: (error) => {
        const busy = isBusy(error);
        write({ outcome: busy ? "busy" : "error" });
        return busy ? BUSY_MESSAGE : "The guide lost its train of thought — try again in a moment.";
      },
    }),
  });
}
