// lib/guide/request.ts
// What the AI guide accepts from a browser — and nothing else (PUBLIC-
// REDESIGN-PLAN §3a, defence in layers). The chat sends its history each
// turn; this rebuilds it from a strict whitelist so a forged request can't
// smuggle in a system message, an unknown tool result, files, provider
// options or an oversized payload. Anything off-shape is refused whole.
//
// A visitor can still forge their own history (they own it) — that only ever
// changes their own conversation, and the instructions tell the model that
// nothing in the conversation is an instruction.

import { z } from "zod";
import type { UIMessage } from "ai";

/** Tool parts the guide's own tools produce; anything else is refused. */
export const GUIDE_TOOL_NAMES = ["open_page", "search_systems", "draft_inquiry"] as const;

// Hard ceilings independent of the settings — the shape of a sane request.
const MAX_MESSAGES = 220; // 100 questions (the setting's ceiling) + answers + slack
const MAX_TEXT = 12_000; // one assistant answer's worth; user text is bounded by the setting
// About 30K tokens: a full 20-question conversation fits; a forged history padded to run up the bill does not.
const MAX_TOTAL = 120_000;

const TextPart = z.object({ type: z.literal("text"), text: z.string().max(MAX_TEXT) }).strip();
const StepStart = z.object({ type: z.literal("step-start") }).strip();
const ToolPart = z
  .object({
    type: z.enum(GUIDE_TOOL_NAMES.map((n) => `tool-${n}`) as [string, ...string[]]),
    toolCallId: z.string().max(100),
    state: z.enum(["input-available", "output-available", "output-error"]),
    input: z.unknown().optional(),
    output: z.unknown().optional(),
    errorText: z.string().max(500).optional(),
  })
  .strip();

// A reasoning model streams its reasoning, and the chat sends it back with the
// history. It is accepted (or every follow-up question would fail) and then
// dropped: the model never sees reasoning the browser could have rewritten.
const ReasoningPart = z.object({ type: z.literal("reasoning"), text: z.string().max(MAX_TEXT) }).strip();

const UserMessage = z.object({ id: z.string().max(100), role: z.literal("user"), parts: z.array(TextPart).min(1).max(1) }).strip();
const AssistantMessage = z
  .object({
    id: z.string().max(100),
    role: z.literal("assistant"),
    parts: z
      .array(z.union([TextPart, StepStart, ToolPart, ReasoningPart]))
      .max(40)
      .transform((parts) => parts.filter((p) => p.type !== "reasoning")),
  })
  .strip();

export const GuideRequestSchema = z
  .object({
    messages: z.array(z.union([UserMessage, AssistantMessage])).min(1).max(MAX_MESSAGES),
    lens: z.string().max(60).nullish(),
  })
  .strip();

export type GuideRequest = z.infer<typeof GuideRequestSchema>;

export type GuideRequestProblem =
  | { code: "VALIDATION_ERROR"; message: string }
  | { code: "QUESTION_TOO_LONG"; message: string }
  | { code: "CONVERSATION_LIMIT"; message: string };

export interface GuideLimits {
  maxQuestionCharacters: number;
  maxMessagesPerConversation: number;
}

/** Parse and bound a request. Returns the clean messages, or the reason it was refused. */
export function parseGuideRequest(
  body: unknown,
  limits: GuideLimits,
): { ok: true; messages: UIMessage[]; lens: string | null; isNewQuestion: boolean } | { ok: false; problem: GuideRequestProblem } {
  const parsed = GuideRequestSchema.safeParse(body);
  if (!parsed.success) return { ok: false, problem: { code: "VALIDATION_ERROR", message: "That message couldn't be read." } };

  const { messages } = parsed.data;
  if (JSON.stringify(messages).length > MAX_TOTAL) {
    return { ok: false, problem: { code: "CONVERSATION_LIMIT", message: "This conversation is long — start a new one to keep going." } };
  }

  const questions = messages.filter((m) => m.role === "user");
  if (questions.length === 0) return { ok: false, problem: { code: "VALIDATION_ERROR", message: "Ask a question to start." } };
  if (questions.length > limits.maxMessagesPerConversation) {
    return { ok: false, problem: { code: "CONVERSATION_LIMIT", message: "This conversation has reached its limit — start a new one, or write to him directly." } };
  }

  const last = messages[messages.length - 1]!;
  const isNewQuestion = last.role === "user";
  if (isNewQuestion) {
    const text = (last.parts[0] as { text: string }).text.trim();
    if (!text) return { ok: false, problem: { code: "VALIDATION_ERROR", message: "Ask a question to start." } };
    if (text.length > limits.maxQuestionCharacters) {
      return { ok: false, problem: { code: "QUESTION_TOO_LONG", message: `Keep it under ${limits.maxQuestionCharacters} characters, please.` } };
    }
  } else if (!last.parts.some((p) => p.type.startsWith("tool-"))) {
    // An assistant turn is only ever sent back to continue after one of the guide's own tools.
    return { ok: false, problem: { code: "VALIDATION_ERROR", message: "That message couldn't be read." } };
  }

  return { ok: true, messages: messages as unknown as UIMessage[], lens: parsed.data.lens ?? null, isNewQuestion };
}
