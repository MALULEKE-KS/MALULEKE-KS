// components/guide/console/Conversation.tsx
// The conversation inside the console: a welcome with the visitor's lenses
// and this page's questions until the first one is asked, then the messages.
// It follows the newest answer while the visitor is at the bottom, and stops
// following the moment they scroll up to read. Answers are announced politely.

"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { ArrowUpRight, RefreshCw } from "lucide-react";
import { useGuide } from "@/components/guide/GuideProvider";
import { textOf, useGuideChat } from "@/components/guide/GuideChatProvider";
import { AnswerMessage } from "@/components/guide/console/AnswerMessage";
import { BlurFade } from "@/components/ui/blur-fade";
import { TypingAnimation } from "@/components/ui/typing-animation";
import { cn } from "@/lib/utils";

export function Conversation({ onNavigate, className }: { onNavigate?: () => void; className?: string }) {
  const { ownerFirstName, lenses } = useGuide();
  const { messages, busy, failure, opening, send, pickLens, retry } = useGuideChat();
  const pathname = usePathname();
  const box = useRef<HTMLDivElement>(null);
  const following = useRef(true);
  const last = messages[messages.length - 1];

  useEffect(() => {
    const el = box.current;
    if (el && following.current) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, busy, failure]);

  return (
    <div
      ref={box}
      onScroll={(e) => {
        const el = e.currentTarget;
        following.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
      }}
      className={cn("relative min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain px-4 py-5 text-sm leading-relaxed sm:px-5", className)}
      aria-live="polite"
      aria-busy={busy}
    >
      {messages.length === 0 && (
        <div className="space-y-6">
          <div>
            <p className="text-paper max-w-prose text-[15px] leading-relaxed">
              <TypingAnimation>{`Hi — I'm ${ownerFirstName}'s AI guide. I read this site's live data and his GitHub, and I'll show you what I find. What brings you here?`}</TypingAnimation>
            </p>
            {lenses.length > 0 && (
              <ul className="mt-4 flex flex-wrap gap-2" aria-label="Pick where to start">
                {lenses.map((l, i) => (
                  <li key={l.key}>
                    <BlurFade delay={0.2 + 0.05 * i} y={4}>
                      <button
                        type="button"
                        onClick={() => pickLens(l.key, l.label)}
                        className="border-white/12 text-mist hover:text-paper hover:border-ember/40 min-h-9 rounded-full border bg-white/5 px-3.5 py-1.5 text-[13px] transition-colors"
                      >
                        {l.label}
                      </button>
                    </BlurFade>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {opening.length > 0 && (
            <div>
              <p className="text-line mb-2 font-mono text-[10.5px] tracking-[0.14em] uppercase">Try asking</p>
              <ul className="grid gap-2 sm:grid-cols-2">
                {opening.map((q, i) => (
                  <li key={q}>
                    <BlurFade delay={0.3 + 0.06 * i} y={4} className="h-full">
                      <button
                        type="button"
                        onClick={() => send(q)}
                        className="group/q hover:border-ember/40 flex h-full w-full items-start gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2.5 text-left text-[13px] leading-snug transition-colors hover:bg-white/[0.05]"
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
          <AnswerMessage key={m.id} message={m} live={busy && m.id === last?.id} onNavigate={onNavigate} />
        ),
      )}

      {/* Sent, nothing back yet: the trail's first line, so there's never a blank wait. */}
      {busy && last?.role === "user" && (
        <p className="text-mist inline-flex items-center gap-2 text-[12px]">
          <span aria-hidden="true" className="bg-ember size-1.5 rounded-full motion-safe:animate-ping" /> Reading your question…
        </p>
      )}

      {failure && (
        <p role="alert" className={cn("rounded-xl border px-3 py-2 text-xs", failure.resting ? "border-ember/30 bg-ember/10" : "border-white/10 bg-white/5")}>
          {failure.text}{" "}
          {!failure.resting && (
            <button type="button" onClick={retry} className="text-paper inline-flex items-center gap-1 underline underline-offset-2">
              <RefreshCw aria-hidden="true" className="size-3" /> Try again
            </button>
          )}{" "}
          {pathname !== "/contact" && (
            <a href="/contact" className="text-ember underline underline-offset-2">
              Write to {ownerFirstName}
            </a>
          )}
        </p>
      )}
    </div>
  );
}
