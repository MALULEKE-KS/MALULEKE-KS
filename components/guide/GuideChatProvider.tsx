// components/guide/GuideChatProvider.tsx
// The AI guide's one conversation (docs/AI-GUIDE-PHASE1-PLAN.md §3). It used
// to live inside the chat panel; it lives here now, so the home page's console
// and the docked panel on every other page are two views of the same
// conversation — start on the home page, keep talking on /systems.
//
// Everything the panel did, kept: the page the visitor is on goes with each
// question ("this system" means the one on screen); the conversation survives
// a reload in this tab (sessionStorage, never the server); a failed answer can
// be retried, a limit says when answers come back; open_page and draft_inquiry
// run in the browser (a draft is never sent — BR-4.2). And it drives the
// character: attentive while the visitor writes, thinking while the guide
// works, speaking while the answer streams (the mouth follows the text).

"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { AnswerTools } from "@/components/guide/console/AnswerFeedback";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls, type ChatStatus, type UIMessage } from "ai";
import { readSessionLens, useGuide } from "@/components/guide/GuideProvider";
import { INQUIRY_DRAFT_KEY } from "@/lib/guide/keys";
import { questionsFor, type PageSuggestions } from "@/lib/guide/suggestions";
import { currentActivity, type TrailStep } from "@/lib/guide/trail";
import type { GuideSiteIndex } from "@/lib/guide/receipts";

/** A limit the visitor can't retry past right away — the message says when answers come back. */
const RESTING = new Set(["RATE_LIMITED", "GUIDE_RESTING", "CONVERSATION_LIMIT"]);
const CHAT_KEY = "mks.guide.chat";
/** The saved conversation is capped well under the route's own limits. */
const MAX_SAVED_CHARS = 60_000;

export interface GuideFailure {
  text: string;
  /** A limit: retrying now won't help, so no "Try again". */
  resting: boolean;
}

/** "Thu 9 Oct, 14:30" — in the visitor's own time zone. */
const when = (iso: string) => new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(iso));

function readError(error: Error | undefined): GuideFailure | null {
  if (!error) return null;
  try {
    const parsed = JSON.parse(error.message) as { error?: { code?: string; message?: string; details?: { limit?: number; resetsAt?: string } | null } };
    const e = parsed.error;
    const at = e?.details?.resetsAt && !Number.isNaN(Date.parse(e.details.resetsAt)) ? when(e.details.resetsAt) : null;
    // A limit says exactly what was used up, and when answers come back (owner, 2026-10-08).
    if (e?.code === "RATE_LIMITED" && at) {
      return { text: `This device has used all ${e.details?.limit ?? "its"} answers it can have for now — that's the limit. Try again on ${at}.`, resting: true };
    }
    if (e?.code === "GUIDE_RESTING" && at) {
      return { text: `The guide has given every answer it has for today, across everyone. It's back on ${at}.`, resting: true };
    }
    if (e?.message) return { text: e.message, resting: RESTING.has(e.code ?? "") };
  } catch {
    // Not a JSON error body.
  }
  return { text: "The guide couldn't answer just now — try again in a moment.", resting: false };
}

export function textOf(message: UIMessage) {
  return message.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
}

interface GuideChat {
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

const ChatContext = createContext<GuideChat | null>(null);

export function GuideChatProvider({
  maxQuestionCharacters,
  privacyNote = null,
  checkNote = null,
  answerTools = null,
  suggestions,
  pageSuggestions = [],
  siteIndex,
  children,
}: {
  maxQuestionCharacters: number;
  privacyNote?: string | null;
  checkNote?: string | null;
  answerTools?: AnswerTools | null;
  /** Example questions (the "ai-guide" content block). */
  suggestions: string[];
  /** Questions for particular pages, shown first there (the same block). */
  pageSuggestions?: PageSuggestions[];
  siteIndex: GuideSiteIndex;
  children: React.ReactNode;
}) {
  const { open, pending, clearPending, setMood, speak, hush, setLens } = useGuide();
  const router = useRouter();
  const pathname = usePathname();
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/v1/guide",
        // Only what the route accepts: the history, the lens (read at send time) and the page.
        prepareSendMessagesRequest: ({ messages }) => ({ body: { messages, lens: readSessionLens(), page: window.location.pathname } }),
      }),
    [],
  );

  const { messages, sendMessage, regenerate, status, error, stop, setMessages, addToolOutput, clearError } = useChat({
    transport,
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onToolCall({ toolCall }) {
      if (toolCall.dynamic) return;
      if (toolCall.toolName === "open_page") {
        const { path, section } = toolCall.input as { path: string; section?: string };
        // The route only offers the site's own paths; check again before navigating.
        if (typeof path !== "string" || !/^\/(?!\/)[a-z0-9\-/]*$/.test(path)) {
          addToolOutput({ tool: "open_page", toolCallId: toolCall.toolCallId, state: "output-error", errorText: "Not a page on this site." });
          return;
        }
        const hash = section ? `#${section.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}` : "";
        router.push(`${path}${hash}`);
        addToolOutput({ tool: "open_page", toolCallId: toolCall.toolCallId, output: { opened: path } });
      }
      if (toolCall.toolName === "draft_inquiry") {
        const { message, category } = toolCall.input as { message: string; category?: string };
        try {
          sessionStorage.setItem(INQUIRY_DRAFT_KEY, String(message).slice(0, 2000));
        } catch {
          // Storage blocked: the draft stays in the chat for the visitor to copy.
        }
        // The kind of message, when the guide knew it — a lookup key, so only letters, digits and dashes.
        const about = typeof category === "string" && /^[a-z0-9-]{1,60}$/.test(category) ? `?about=${category}` : "";
        router.push(`/contact${about}`);
        addToolOutput({ tool: "draft_inquiry", toolCallId: toolCall.toolCallId, output: { drafted: true, sent: false } });
      }
    },
  });

  const busy = status === "submitted" || status === "streaming";

  // The conversation survives a reload in this tab (never sent anywhere but the guide).
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    try {
      const saved = sessionStorage.getItem(CHAT_KEY);
      if (saved) setMessages(JSON.parse(saved) as UIMessage[]);
    } catch {
      // Unreadable or blocked: start fresh.
    }
  }, [setMessages]);
  useEffect(() => {
    if (busy || !restored.current) return;
    try {
      const json = JSON.stringify(messages);
      if (messages.length === 0) sessionStorage.removeItem(CHAT_KEY);
      else if (json.length <= MAX_SAVED_CHARS) sessionStorage.setItem(CHAT_KEY, json);
    } catch {
      // Storage full or blocked: the conversation just won't survive a reload.
    }
  }, [messages, busy]);

  const last = messages[messages.length - 1];
  const lastText = last?.role === "assistant" ? textOf(last) : "";
  const working = status === "submitted" || (status === "streaming" && !lastText);
  const activity = status === "submitted" ? null : busy ? currentActivity(last) : null;

  // The character follows the conversation.
  useEffect(() => {
    setMood(working ? "thinking" : status === "streaming" ? "speaking" : open ? "attentive" : "idle");
  }, [working, status, open, setMood]);

  // How long the guide thought before its first word, per answer.
  const startedAt = useRef<number | null>(null);
  const [thoughtFor, setThoughtFor] = useState<Record<string, number>>({});
  useEffect(() => {
    if (status === "submitted") startedAt.current = Date.now();
  }, [status]);
  const lastId = last?.role === "assistant" ? last.id : null;
  const answering = lastText.length > 0;
  useEffect(() => {
    if (!lastId || !answering || startedAt.current === null) return;
    const seconds = Math.round((Date.now() - startedAt.current) / 1000);
    startedAt.current = null;
    setThoughtFor((t) => (t[lastId] ? t : { ...t, [lastId]: seconds }));
  }, [lastId, answering]);

  // The mouth follows the newest text as it streams in — and closes the moment the answer ends.
  const spoken = useRef(0);
  useEffect(() => {
    if (status !== "streaming") {
      if (spoken.current > 0) hush();
      spoken.current = 0;
      return;
    }
    if (lastText.length > spoken.current) {
      speak(lastText.slice(spoken.current));
      spoken.current = lastText.length;
    }
  }, [lastText, status, speak, hush]);

  const [askedAt, setAskedAt] = useState<number | null>(null);
  const [tourStep, setTourSteps] = useState<Record<string, number>>({});
  const setTourStep = useCallback((id: string, step: number) => setTourSteps((s) => ({ ...s, [id]: step })), []);
  const send = useCallback(
    (text: string) => {
      const t = text.trim();
      if (!t) return;
      setAskedAt(Date.now());
      clearError();
      void sendMessage({ text: t });
    },
    [clearError, sendMessage],
  );

  // A question handed over by the page (a lens chip in the hero, "Ask about this system").
  useEffect(() => {
    if (!pending || busy) return;
    clearPending();
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a question handed over by the page is sent as it arrives
    send(pending);
  }, [pending, busy, clearPending, send]);

  const value = useMemo<GuideChat>(
    () => ({
      messages,
      status,
      busy,
      working,
      activity,
      failure: readError(error),
      thoughtFor,
      opening: [...new Set([...questionsFor(pathname, pageSuggestions), ...suggestions])].slice(0, 4),
      maxQuestionCharacters,
      privacyNote,
      checkNote,
      answerTools,
      siteIndex,
      askedAt,
      tourStep,
      setTourStep,
      send,
      pickLens: (key, label) => {
        setLens(key);
        send(label);
      },
      stop: () => void stop(),
      retry: () => {
        clearError();
        void regenerate();
      },
      reset: () => {
        void stop();
        setMessages([]);
        clearError();
        setThoughtFor({});
        setTourSteps({});
      },
    }),
    [messages, status, busy, working, activity, error, thoughtFor, pathname, pageSuggestions, suggestions, maxQuestionCharacters, privacyNote, checkNote, answerTools, siteIndex, askedAt, tourStep, setTourStep, send, setLens, stop, clearError, regenerate, setMessages],
  );
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useGuideChat() {
  const ctx = useContext(ChatContext);
  if (!ctx) throw new Error("useGuideChat must be used inside <GuideChatProvider>");
  return ctx;
}
