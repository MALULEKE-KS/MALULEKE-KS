// components/guide/chat-types.ts
// What the AI guide's conversation looks like to the components that show it.
// The conversation itself runs in GuideChatEngine, loaded after the first view
// (WP-102); until then — and for a visitor who never asks — the panel and the
// console see the same shape, empty and ready.

import type { ChatStatus, UIMessage } from "ai";
import type { AnswerTools } from "@/components/guide/console/AnswerFeedback";
import type { TrailStep } from "@/lib/guide/trail";
import type { GuideSiteIndex } from "@/lib/guide/receipts";

/** Where this tab keeps its conversation (sessionStorage — never sent anywhere but the guide). */
export const CHAT_KEY = "mks.guide.chat";

export interface GuideFailure {
  text: string;
  /** A limit: retrying now won't help, so no "Try again". */
  resting: boolean;
}

export function textOf(message: UIMessage) {
  return message.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
}

export interface GuideChat {
  messages: UIMessage[];
  status: ChatStatus;
  /** Sent, thinking or streaming. */
  busy: boolean;
  /** Waiting for the first word — the character is thinking. */
  working: boolean;
  /** The step running right now (the character's caption), if any. */
  activity: TrailStep | null;
  failure: GuideFailure | null;
  /** Seconds before the first word, per answer. */
  thoughtFor: Record<string, number>;
  /** Up to four questions to start with — this page's first. */
  opening: string[];
  maxQuestionCharacters: number;
  /** What the guide keeps of a question it can't answer, in the owner's words — shown beside the box; null when nothing is kept. */
  privacyNote: string | null;
  /** The guide's own nightly self-check, in the owner's words; null before the first run. */
  checkNote: string | null;
  /** The owner's words for the buttons under an answer (feedback, challenge); null when none are written. */
  answerTools: AnswerTools | null;
  siteIndex: GuideSiteIndex;
  /** When the visitor last asked something (ms) — null until they do in this page view. */
  askedAt: number | null;
  /** Where each guided tour is up to (by the tool call's id) — kept here so a tour survives the console moving between pages. */
  tourStep: Record<string, number>;
  setTourStep: (toolCallId: string, step: number) => void;
  send: (text: string) => void;
  /** A lens chip: remember the lens, then ask with its label. */
  pickLens: (key: string, label: string) => void;
  stop: () => void;
  retry: () => void;
  reset: () => void;
}

/** Where the running conversation is published; every view reads it. */
export interface GuideChatStore {
  get: () => GuideChat;
  set: (value: GuideChat) => void;
  subscribe: (listener: () => void) => () => void;
}

export function createChatStore(initial: GuideChat): GuideChatStore {
  let value = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => value,
    set: (next) => {
      if (next === value) return;
      value = next;
      for (const l of listeners) l();
    },
    subscribe: (l) => {
      listeners.add(l);
      return () => void listeners.delete(l);
    },
  };
}

/** The one question a visitor asked before the engine arrived: held, then handed over once. */
export interface HeldQuestion {
  hold: (text: string) => void;
  take: () => string | null;
}

export function createHeldQuestion(): HeldQuestion {
  let held: string | null = null;
  return {
    hold: (text) => {
      held = text;
    },
    take: () => {
      const text = held;
      held = null;
      return text;
    },
  };
}
