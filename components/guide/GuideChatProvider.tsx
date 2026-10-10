// components/guide/GuideChatProvider.tsx
// The AI guide's one conversation, as every view sees it (docs/AI-GUIDE-PHASE1-PLAN.md §3):
// the home page's console and the docked panel on every other page are two views of the
// same conversation — start on the home page, keep talking on /systems.
//
// The conversation itself — the AI SDK, its stream validation, the character's mood —
// runs in GuideChatEngine, which is loaded AFTER the first view (WP-102): about 110 KB of
// script a phone would otherwise download and run before showing the first word of the
// page. It mounts on the first sign of use: a tap, a key press, a scroll, the panel
// opening, a question handed over by the page, or a conversation saved in this tab. Until
// then every view sees the same shape, empty and ready, and a question asked in the gap
// is held and sent the moment the engine arrives.

"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import type { AnswerTools } from "@/components/guide/console/AnswerFeedback";
import { useGuide } from "@/components/guide/GuideProvider";
import { CHAT_KEY, createChatStore, createHeldQuestion, type GuideChat, type GuideChatStore } from "@/components/guide/chat-types";
import { questionsFor, type PageSuggestions } from "@/lib/guide/suggestions";
import type { GuideSiteIndex } from "@/lib/guide/receipts";

export { textOf, type GuideChat, type GuideFailure } from "@/components/guide/chat-types";

const GuideChatEngine = dynamic(() => import("@/components/guide/GuideChatEngine"), { ssr: false });

/** The first of these means a visitor is using the page — time to bring the conversation in. */
const SIGNS_OF_USE = ["pointerdown", "keydown", "touchstart", "scroll", "focusin"] as const;

const ChatContext = createContext<GuideChatStore | null>(null);

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
  const { open, pending, setLens } = useGuide();
  const pathname = usePathname();
  const [wanted, setWanted] = useState(false);
  /** A question is held while the engine loads: the views show the guide as already working on it. */
  const [holding, setHolding] = useState(false);
  const [held] = useState(createHeldQuestion);

  // Before the engine: the empty conversation, with this page's opening questions.
  const idle = useMemo<GuideChat>(() => {
    const ask = (text: string) => {
      const t = text.trim();
      if (!t) return;
      held.hold(t);
      setHolding(true);
      setWanted(true);
    };
    return {
      messages: [],
      status: holding ? "submitted" : "ready",
      busy: holding,
      working: holding,
      activity: null,
      failure: null,
      thoughtFor: {},
      opening: [...new Set([...questionsFor(pathname, pageSuggestions), ...suggestions])].slice(0, 4),
      maxQuestionCharacters,
      privacyNote,
      checkNote,
      answerTools,
      siteIndex,
      askedAt: null,
      tourStep: {},
      setTourStep: () => {},
      send: ask,
      pickLens: (key, label) => {
        setLens(key);
        ask(label);
      },
      stop: () => {},
      retry: () => {},
      reset: () => {},
    };
  }, [pathname, pageSuggestions, suggestions, maxQuestionCharacters, privacyNote, checkNote, answerTools, siteIndex, setLens, held, holding]);

  const [store] = useState(() => createChatStore(idle));
  // Until the engine takes over, keep the store's empty conversation current (a new page, new questions).
  const engineLive = useRef(false);
  const markLive = useCallback(() => {
    engineLive.current = true;
  }, []);
  useEffect(() => {
    if (!engineLive.current) store.set(idle);
  }, [store, idle]);

  // The panel opening or a question handed over by the page needs the engine now.
  useEffect(() => {
    if (open || pending) setWanted(true); // eslint-disable-line react-hooks/set-state-in-effect -- reacting to the guide being opened or asked
  }, [open, pending]);

  // A conversation saved in this tab comes back; otherwise wait for the first sign of use.
  useEffect(() => {
    try {
      if (sessionStorage.getItem(CHAT_KEY)) setWanted(true); // eslint-disable-line react-hooks/set-state-in-effect -- restoring a saved conversation
    } catch {
      // Storage blocked: nothing to restore.
    }
    const go = () => setWanted(true);
    for (const e of SIGNS_OF_USE) window.addEventListener(e, go, { once: true, passive: true });
    return () => {
      for (const e of SIGNS_OF_USE) window.removeEventListener(e, go);
    };
  }, []);

  return (
    <ChatContext.Provider value={store}>
      {children}
      {wanted && (
        <EngineGate onLive={markLive}>
          <GuideChatEngine
            maxQuestionCharacters={maxQuestionCharacters}
            privacyNote={privacyNote}
            checkNote={checkNote}
            answerTools={answerTools}
            suggestions={suggestions}
            pageSuggestions={pageSuggestions}
            siteIndex={siteIndex}
            store={store}
            held={held}
          />
        </EngineGate>
      )}
    </ChatContext.Provider>
  );
}

/** Tells the provider the engine is mounted, so the empty conversation stops overwriting the live one. */
function EngineGate({ onLive, children }: { onLive: () => void; children: React.ReactNode }) {
  useEffect(() => {
    onLive();
  }, [onLive]);
  return <>{children}</>;
}

export function useGuideChat(): GuideChat {
  const store = useContext(ChatContext);
  if (!store) throw new Error("useGuideChat must be used inside <GuideChatProvider>");
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
