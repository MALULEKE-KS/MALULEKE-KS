// components/guide/console/Composer.tsx
// Where the visitor writes. While they type, every character on screen looks
// at it (the rig's gaze); Enter sends, Shift+Enter breaks a line; the answer
// can be stopped. The guide is labelled AI here, always (BR-4.3).

"use client";

import { forwardRef, useState } from "react";
import { ArrowUp, ShieldCheck, Square } from "lucide-react";
import { useGuide } from "@/components/guide/GuideProvider";
import { useGuideChat } from "@/components/guide/GuideChatProvider";
import { cn } from "@/lib/utils";
import { warmGuide } from "@/lib/guide/warm-client";

export const Composer = forwardRef<HTMLTextAreaElement, { id: string }>(function Composer({ id }, ref) {
  const { ownerFirstName, lookAt, setMood, mood } = useGuide();
  const { busy, send, stop, maxQuestionCharacters } = useGuideChat();
  const [input, setInput] = useState("");
  const tooLong = input.length > maxQuestionCharacters;

  function submit() {
    if (!input.trim() || busy || tooLong) return;
    send(input);
    setInput("");
  }
  // The guide looks up at what's being written.
  const watch = (el: HTMLTextAreaElement) => {
    if (mood === "idle") setMood("attentive");
    lookAt(el);
  };

  return (
    <form
      className="relative border-t border-white/[0.07] p-3 max-sm:pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="rounded-2xl bg-white/10 p-px transition-[background] duration-300 focus-within:bg-[linear-gradient(120deg,var(--color-ember),#ffb547,rgb(96_130_170))]">
        <div className="bg-night flex items-end gap-2 rounded-[15px] p-2">
          <label htmlFor={id} className="sr-only">
            Ask the AI guide
          </label>
          <textarea
            id={id}
            ref={ref}
            rows={1}
            value={input}
            onFocus={(e) => {
              watch(e.currentTarget);
              warmGuide();
            }}
            onChange={(e) => {
              setInput(e.target.value);
              watch(e.currentTarget);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={`Ask about ${ownerFirstName}'s work — or anything`}
            className="placeholder:text-line max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-[15px] outline-none [field-sizing:content] sm:text-sm"
          />
          {busy ? (
            <button type="button" onClick={stop} className="bg-paper text-ink grid size-10 shrink-0 place-items-center rounded-full" aria-label="Stop the answer">
              <Square aria-hidden="true" className="size-3.5 fill-current" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={!input.trim() || tooLong}
              className="bg-ember text-ink shadow-glow-ember grid size-10 shrink-0 place-items-center rounded-full transition-[transform,opacity] hover:scale-105 disabled:opacity-40 disabled:shadow-none disabled:hover:scale-100"
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
  );
});
