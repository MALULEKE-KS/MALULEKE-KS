// components/guide/console/GuideConsole.tsx
// The AI guide's console (docs/AI-GUIDE-PHASE1-PLAN.md §3–4, §8): one
// component, two places, the same conversation.
//
// - "inline" — the home page's own section. Desktop: the character large on a
//   stage beside the conversation (GuideStage). Phone: designed for the phone —
//   the character's bust in a header that stays put while the conversation
//   scrolls under it, the composer at thumb reach, and "full screen" for a
//   long conversation (the same console, fixed to the viewport).
// - "panel" — every other page's docked chat (GuidePanel): the bust in the
//   header, then the conversation and the composer.
//
// Either way the character is on screen whenever the guide is working.

"use client";

import { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, RotateCcw, X } from "lucide-react";
import { useGuide } from "@/components/guide/GuideProvider";
import { useGuideChat } from "@/components/guide/GuideChatProvider";
import { Composer } from "@/components/guide/console/Composer";
import { Conversation } from "@/components/guide/console/Conversation";
import { GuideBust, GuideStage, useGuideStatus } from "@/components/guide/console/GuideStage";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import { BorderBeam } from "@/components/ui/border-beam";
import { cn } from "@/lib/utils";

function Header({ variant, full, onFull, onClose }: { variant: "inline" | "panel"; full: boolean; onFull?: () => void; onClose?: () => void }) {
  const { ownerFirstName } = useGuide();
  const { messages, reset } = useGuideChat();
  const { label, busy } = useGuideStatus();
  const icon = "text-mist hover:text-paper grid size-10 place-items-center rounded-full transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-ember";
  return (
    <header className={cn("relative flex items-center gap-3 border-b border-white/[0.07] px-4 py-3", variant === "inline" && !full && "lg:hidden")}>
      <GuideBust className="size-12" />
      <div className="min-w-0 flex-1">
        <h3 id={`guide-title-${variant}`} className="text-paper flex items-center gap-2 text-sm font-semibold">
          {ownerFirstName}&apos;s AI guide
          <span className="border-ember/30 bg-ember/10 text-ember rounded-full border px-1.5 py-px text-[10px] font-medium tracking-wide uppercase">AI</span>
        </h3>
        <p className="mt-0.5 truncate text-[11.5px]">{busy ? <AnimatedShinyText className="text-[11.5px]">{label}…</AnimatedShinyText> : <span className="text-mist">{label}</span>}</p>
      </div>
      {messages.length > 0 && (
        <button type="button" onClick={reset} className={icon} aria-label="Start a new conversation" title="New conversation">
          <RotateCcw aria-hidden="true" className="size-4" />
        </button>
      )}
      {onFull && (
        <button type="button" onClick={onFull} className={cn(icon, "lg:hidden")} aria-label={full ? "Leave full screen" : "Full screen"} title={full ? "Leave full screen" : "Full screen"}>
          {full ? <Minimize2 aria-hidden="true" className="size-4" /> : <Maximize2 aria-hidden="true" className="size-4" />}
        </button>
      )}
      {onClose && (
        <button type="button" onClick={onClose} className={icon} aria-label="Close the AI guide">
          <X aria-hidden="true" className="size-4" />
        </button>
      )}
    </header>
  );
}

export function GuideConsole({ variant, onClose, onNavigate }: { variant: "inline" | "panel"; onClose?: () => void; onNavigate?: () => void }) {
  const [full, setFull] = useState(false);
  const input = useRef<HTMLTextAreaElement>(null);
  const { askedAt } = useGuideChat();

  // Full screen on a phone: the page behind doesn't scroll; Escape leaves.
  useEffect(() => {
    if (!full) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setFull(false);
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [full]);
  // On a phone, asking opens the console full screen — room to read the answer. Only a
  // question just asked does this — never a conversation restored on reload, nor
  // reopening the section later.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- the visitor just asked; give the answer the screen
    if (variant === "inline" && askedAt !== null && Date.now() - askedAt < 4000 && !window.matchMedia("(min-width: 64rem)").matches) setFull(true);
  }, [askedAt, variant]);

  const chat = (
    <div
      className={cn(
        "bg-night/90 relative flex min-h-0 flex-col overflow-hidden",
        variant === "panel" && "h-full",
        variant === "inline" &&
          (full
            ? "fixed inset-0 z-[60] h-dvh rounded-none"
            : "h-[min(36rem,calc(100dvh-7rem))] rounded-3xl border border-white/10 shadow-[0_40px_100px_-50px_rgb(0_0_0/0.95)] lg:h-[38rem]"),
      )}
      role={variant === "inline" && full ? "dialog" : undefined}
      aria-modal={variant === "inline" && full ? true : undefined}
      aria-labelledby={`guide-title-${variant}`}
    >
      <Header variant={variant} full={full} onFull={variant === "inline" ? () => setFull((f) => !f) : undefined} onClose={onClose} />
      <Conversation onNavigate={() => {
        setFull(false);
        onNavigate?.();
      }} />
      <Composer id={`guide-input-${variant}`} ref={input} />
      {variant === "inline" && !full && <BorderBeam size={160} duration={12} colorFrom="#FF5B1F" colorTo="#FFB547" />}
    </div>
  );

  if (variant === "panel") return chat;
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,0.72fr)_minmax(0,1.5fr)]">
      <GuideStage className="hidden h-[38rem] lg:flex" />
      {chat}
    </div>
  );
}
