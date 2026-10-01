// components/guide/GuidePanel.tsx
// The AI guide's chat (PUBLIC-REDESIGN-PLAN §3a): a panel on desktop, a
// bottom sheet on phones. Lives in the public shell, so a conversation
// survives moving between pages — the guide can take a visitor somewhere and
// keep talking.
//
// The accessible interface to the guide (the character is decorative): a
// labelled dialog, focus moves in on open and back on close, Escape closes,
// answers are announced politely as they finish.
//
// It drives the character: thinking while waiting, speaking while the answer
// streams (the mouth follows the text), a point when it opens a page.

"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls, type UIMessage } from "ai";
import { ArrowUp, ArrowUpRight, Compass, PenLine, RotateCcw, Search, ShieldCheck, Square, X, type LucideIcon } from "lucide-react";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import { BlurFade } from "@/components/ui/blur-fade";
import { BorderBeam } from "@/components/ui/border-beam";
import { DotPattern } from "@/components/ui/dot-pattern";
import { TypingAnimation } from "@/components/ui/typing-animation";
import { readSessionLens, useGuide } from "@/components/guide/GuideProvider";
import { GuideText } from "@/components/guide/GuideText";
import { INQUIRY_DRAFT_KEY } from "@/lib/guide/keys";
import { cn } from "@/lib/utils";


function readError(error: Error | undefined): string | null {
  if (!error) return null;
  try {
    const parsed = JSON.parse(error.message) as { error?: { message?: string } };
    if (parsed.error?.message) return parsed.error.message;
  } catch {
    // Not a JSON error body.
  }
  return "The guide couldn't answer just now — try again in a moment.";
}

function textOf(message: UIMessage) {
  return message.parts.map((p) => (p.type === "text" ? p.text : "")).join("");
}

export function GuidePanel({
  maxQuestionCharacters,
  suggestions,
}: {
  maxQuestionCharacters: number;
  /** Example questions (the "ai-guide" content block), so the panel never opens blank. */
  suggestions: string[];
}) {
  const { enabled, ready, linkHosts, open, setOpen, ownerFirstName, lenses, lens, setLens, pending, clearPending, setMood, speak, flashPose } = useGuide();
  const router = useRouter();
  const pathname = usePathname();
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<Element | null>(null);

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/v1/guide",
        // Send only what the route accepts: the history and the lens.
        // The lens is read at send time from the session (setLens saves it synchronously).
        prepareSendMessagesRequest: ({ messages }) => ({ body: { messages, lens: readSessionLens() } }),
      }),
    [],
  );

  const { messages, sendMessage, status, error, stop, setMessages, addToolOutput, clearError } = useChat({
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
        flashPose("point", 1600);
        router.push(`${path}${hash}`);
        addToolOutput({ tool: "open_page", toolCallId: toolCall.toolCallId, output: { opened: path } });
      }
      if (toolCall.toolName === "draft_inquiry") {
        const { message } = toolCall.input as { message: string };
        try {
          sessionStorage.setItem(INQUIRY_DRAFT_KEY, String(message).slice(0, 2000));
        } catch {
          // Storage blocked: the draft stays in the chat for the visitor to copy.
        }
        router.push("/contact#inquiry-form");
        addToolOutput({ tool: "draft_inquiry", toolCallId: toolCall.toolCallId, output: { drafted: true, sent: false } });
      }
    },
  });

  const busy = status === "submitted" || status === "streaming";

  // Drive the character from the chat's state.
  useEffect(() => {
    setMood(status === "submitted" ? "thinking" : status === "streaming" ? "speaking" : open ? "attentive" : "idle");
  }, [status, open, setMood]);

  // The mouth follows the newest text as it streams in.
  const spoken = useRef(0);
  const last = messages[messages.length - 1];
  const lastText = last?.role === "assistant" ? textOf(last) : "";
  useEffect(() => {
    if (status !== "streaming") {
      spoken.current = 0;
      return;
    }
    if (lastText.length > spoken.current) {
      speak(lastText.slice(spoken.current));
      spoken.current = lastText.length;
    }
  }, [lastText, status, speak]);

  // A question handed over by the page (a lens chip, "Ask about this system").
  useEffect(() => {
    if (!pending || busy) return;
    clearPending();
    clearError();
    void sendMessage({ text: pending });
  }, [pending, busy, clearPending, clearError, sendMessage]);

  // Focus in on open, back to where it came from on close; Escape closes.
  useEffect(() => {
    if (!open) return;
    openerRef.current = document.activeElement;
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(t);
      document.removeEventListener("keydown", onKey);
      if (openerRef.current instanceof HTMLElement) openerRef.current.focus();
    };
  }, [open, setOpen]);

  // Keep the newest message in view.
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, status]);

  if (!enabled) return null;

  const errorText = readError(error);
  const tooLong = input.length > maxQuestionCharacters;

  function submit() {
    const text = input.trim();
    if (!text || busy || tooLong) return;
    clearError();
    setInput("");
    void sendMessage({ text });
  }

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-labelledby="guide-title"
      hidden={!open}
      className={cn(
        "fixed z-50 rounded-t-3xl bg-[linear-gradient(160deg,rgb(255_91_31/0.55),rgb(255_255_255/0.08)_35%,rgb(96_130_170/0.35))] p-px shadow-[0_40px_120px_-30px_rgb(0_0_0/0.9)]",
        "inset-x-0 bottom-0 h-[85dvh] motion-safe:animate-[guide-in_320ms_cubic-bezier(0.2,0.8,0.2,1)]",
        "sm:inset-x-auto sm:right-5 sm:bottom-5 sm:h-[min(660px,calc(100dvh-2.5rem))] sm:w-[410px] sm:rounded-3xl",
      )}
    >
      <div className="text-paper relative flex h-full flex-col overflow-hidden rounded-t-[23px] bg-night/95 backdrop-blur-2xl sm:rounded-[23px]">
        <DotPattern
          width={18}
          height={18}
          cr={0.8}
          className="pointer-events-none absolute inset-x-0 top-0 h-40 fill-white/[0.06] [mask-image:linear-gradient(to_bottom,#000,transparent)]"
        />

        <header className="relative flex items-center gap-3 border-b border-white/[0.07] px-4 py-3">
          <span className="relative shrink-0">
            {ready && !busy && <span aria-hidden="true" className="absolute inset-0 rounded-full bg-[var(--color-signal-finished-on-dark)]/30 motion-safe:animate-ping" />}
            <Image src="/character/guide-face.webp" alt="" width={40} height={40} className="relative size-10 rounded-full ring-1 ring-white/15" />
            <span
              aria-hidden="true"
              className={cn(
                "absolute -right-0.5 -bottom-0.5 size-3 rounded-full ring-2 ring-night",
                busy ? "animate-pulse bg-ember" : ready ? "bg-[var(--color-signal-finished-on-dark)]" : "bg-line",
              )}
            />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="guide-title" className="flex items-center gap-2 text-sm font-semibold">
              {ownerFirstName}&apos;s AI guide
              <span aria-hidden="true" className="border-ember/30 bg-ember/10 text-ember rounded-full border px-1.5 py-px text-[10px] font-medium tracking-wide uppercase">AI</span>
            </h2>
            <p className="mt-0.5 truncate text-[11px]">
              {busy ? (
                <AnimatedShinyText className="text-[11px]">{status === "submitted" ? "Thinking…" : "Answering…"}</AnimatedShinyText>
              ) : ready ? (
                <AnimatedShinyText className="text-[11px]">Answers from this site&apos;s live data</AnimatedShinyText>
              ) : (
                <span className="text-mist">Resting right now</span>
              )}
            </p>
          </div>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={() => {
                void stop();
                setMessages([]);
                clearError();
              }}
              className="text-mist rounded-full p-2 hover:bg-white/10 hover:text-paper"
              aria-label="Start a new conversation"
              title="New conversation"
            >
              <RotateCcw aria-hidden="true" className="size-4" />
            </button>
          )}
          <button type="button" onClick={() => setOpen(false)} className="text-mist rounded-full p-2 hover:bg-white/10 hover:text-paper" aria-label="Close the AI guide">
            <X aria-hidden="true" className="size-4" />
          </button>
        </header>

        <div ref={listRef} className="relative flex-1 space-y-5 overflow-y-auto px-4 py-5 text-sm leading-relaxed" aria-live="polite" aria-busy={busy}>
          {messages.length === 0 && (
            <div className="space-y-5">
              <GuideRow>
                <p className="rounded-2xl rounded-tl-md border border-white/10 bg-white/[0.05] px-3.5 py-2.5">
                  <TypingAnimation>{`Hi — I'm ${ownerFirstName}'s AI guide. I know his systems, his journey and how he builds, and I can take you anywhere on the site. What brings you here?`}</TypingAnimation>
                </p>
                {lenses.length > 0 && (
                  <ul className="mt-3 flex flex-wrap gap-2" aria-label="Pick where to start">
                    {lenses.map((l, i) => (
                      <li key={l.key}>
                        <BlurFade delay={0.2 + 0.05 * i} y={4}>
                          <button
                            type="button"
                            onClick={() => {
                              setLens(l.key);
                              void sendMessage({ text: l.label });
                            }}
                            className="border-white/12 text-mist hover:text-paper hover:border-ember/40 rounded-full border bg-white/5 px-3 py-1.5 text-xs transition-colors"
                          >
                            {l.label}
                          </button>
                        </BlurFade>
                      </li>
                    ))}
                  </ul>
                )}
              </GuideRow>

              {suggestions.length > 0 && (
                <div>
                  <p className="text-mist mb-2 text-[11px] font-medium tracking-wide uppercase">Try asking</p>
                  <ul className="space-y-1.5">
                    {suggestions.map((q, i) => (
                      <li key={q}>
                        <BlurFade delay={0.3 + 0.06 * i} y={4}>
                          <button
                            type="button"
                            onClick={() => void sendMessage({ text: q })}
                            className="group/q hover:border-ember/40 flex w-full items-start gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2.5 text-left text-[13px] leading-snug transition-colors hover:bg-white/[0.05]"
                          >
                            <span className="type-data text-ember/80 mt-px text-[11px]">{String(i + 1).padStart(2, "0")}</span>
                            <span className="flex-1">{q}</span>
                            <ArrowUpRight aria-hidden="true" className="text-mist group-hover/q:text-ember mt-0.5 size-3.5 shrink-0" />
                          </button>
                        </BlurFade>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {messages.map((m) =>
            m.role === "user" ? (
              <div key={m.id} className="flex justify-end">
                <p className="bg-ember/15 border-ember/25 max-w-[85%] rounded-2xl rounded-br-md border px-3.5 py-2 whitespace-pre-wrap">{textOf(m)}</p>
              </div>
            ) : (
              <GuideRow key={m.id}>
                <div className="space-y-2">
                  {m.parts.map((part, i) => {
                    if (part.type === "text") return part.text.trim() ? <GuideText key={i} text={part.text} hosts={linkHosts} onNavigate={() => window.innerWidth < 640 && setOpen(false)} /> : null;
                    if (part.type === "tool-open_page") {
                      const path = (part.input as { path?: string } | undefined)?.path;
                      return path ? (
                        <ToolChip key={i} icon={Compass}>
                          Opened <span className="text-paper font-mono">{path}</span>
                        </ToolChip>
                      ) : null;
                    }
                    if (part.type === "tool-search_systems") return <ToolChip key={i} icon={Search}>Searched the site</ToolChip>;
                    if (part.type === "tool-draft_inquiry") {
                      return (
                        <ToolChip key={i} icon={PenLine}>
                          Drafted your message on the contact page — review it and press send when you&apos;re happy. Nothing is sent until you do.
                        </ToolChip>
                      );
                    }
                    return null;
                  })}
                </div>
              </GuideRow>
            ),
          )}

          {status === "submitted" && (
            <GuideRow>
              <p className="inline-flex items-center gap-2 text-[13px]" aria-label="Thinking">
                <AnimatedShinyText>Thinking</AnimatedShinyText>
                <span className="flex gap-1" aria-hidden="true">
                  <span className="size-1 animate-bounce rounded-full bg-ember [animation-delay:-0.3s]" />
                  <span className="size-1 animate-bounce rounded-full bg-ember [animation-delay:-0.15s]" />
                  <span className="size-1 animate-bounce rounded-full bg-ember" />
                </span>
              </p>
            </GuideRow>
          )}
          {errorText && (
            <p role="alert" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs">
              {errorText}{" "}
              {pathname !== "/contact" && (
                <a href="/contact" className="text-ember underline underline-offset-2">
                  Write to {ownerFirstName}
                </a>
              )}
            </p>
          )}
        </div>

        <form
          className="relative border-t border-white/[0.07] p-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <div className="rounded-2xl bg-white/10 p-px transition-[background] duration-300 focus-within:bg-[linear-gradient(120deg,var(--color-ember),#ffb547,rgb(96_130_170))]">
            <div className="bg-night flex items-end gap-2 rounded-[15px] p-2">
              <label htmlFor="guide-input" className="sr-only">
                Ask the AI guide
              </label>
              <textarea
                id="guide-input"
                ref={inputRef}
                rows={1}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    submit();
                  }
                }}
                placeholder={`Ask about ${ownerFirstName}'s work — or anything`}
                className="placeholder:text-line max-h-32 min-h-9 flex-1 resize-none bg-transparent px-2 py-1.5 text-sm outline-none [field-sizing:content]"
              />
              {busy ? (
                <button type="button" onClick={() => void stop()} className="bg-paper text-ink grid size-9 shrink-0 place-items-center rounded-full" aria-label="Stop the answer">
                  <Square aria-hidden="true" className="size-3.5 fill-current" />
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!input.trim() || tooLong}
                  className="bg-ember text-ink shadow-glow-ember grid size-9 shrink-0 place-items-center rounded-full transition-[transform,opacity] hover:scale-105 disabled:opacity-40 disabled:shadow-none disabled:hover:scale-100"
                  aria-label="Send"
                >
                  <ArrowUp aria-hidden="true" className="size-4" />
                </button>
              )}
            </div>
          </div>
          <p className="text-line mt-2 flex items-center justify-between gap-2 px-1 text-[11px]">
            <span className="inline-flex items-center gap-1">
              <ShieldCheck aria-hidden="true" className="size-3" /> AI · answers from this site&apos;s data · can make mistakes
            </span>
            <span className={cn(input.length > maxQuestionCharacters * 0.8 ? "" : "invisible", tooLong && "text-[var(--color-ember)]")}>
              {input.length}/{maxQuestionCharacters}
            </span>
          </p>
        </form>
        <BorderBeam size={140} duration={12} colorFrom="#FF5B1F" colorTo="#FFB547" />
      </div>
    </div>
  );
}

/** A reply from the guide: its avatar beside the content. */
function GuideRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <Image src="/character/guide-face.webp" alt="" width={26} height={26} className="mt-0.5 size-[26px] shrink-0 rounded-full ring-1 ring-white/10" />
      <div className="min-w-0 max-w-[88%] flex-1">{children}</div>
    </div>
  );
}

/** What the guide did with one of its tools, as a small chip. */
function ToolChip({ icon: Icon, children }: { icon: LucideIcon; children: React.ReactNode }) {
  return (
    <p className="text-mist inline-flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs">
      <Icon aria-hidden="true" className="text-ember mt-px size-3.5 shrink-0" />
      <span>{children}</span>
    </p>
  );
}
