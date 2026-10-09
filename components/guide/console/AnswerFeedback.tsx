// components/guide/console/AnswerFeedback.tsx
// What a visitor can do about an answer (docs/AI-GUIDE-PHASE2-PLAN.md §7): say it
// was helpful, say it was wrong, or challenge it. Every word on these buttons is
// the owner's (the "ai-guide" content block) and each appears only when written.
// Feedback goes to POST /api/v1/guide/feedback — the question and the answer's
// opening, kept without anything that says who sent it, and only while the owner
// keeps a log at all; challenging simply asks the guide the owner's question.

"use client";

import { useState } from "react";
import { ShieldQuestion, ThumbsDown, ThumbsUp } from "lucide-react";
import { useGuideChat } from "@/components/guide/GuideChatProvider";
import { cn } from "@/lib/utils";

export interface AnswerTools {
  feedbackHelpful?: string;
  feedbackWrong?: string;
  feedbackThanks?: string;
  challengeLabel?: string;
  challengePrompt?: string;
}

const button =
  "text-mist hover:text-paper hover:border-ember/40 inline-flex min-h-8 items-center gap-1.5 rounded-full border border-white/10 px-2.5 py-1 text-[11px] transition-colors disabled:opacity-50";

export function AnswerFeedback({ question, answer }: { question: string; answer: string }) {
  const { answerTools, send, busy } = useGuideChat();
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  if (!answerTools) return null;

  const canRate = Boolean(answerTools.feedbackHelpful && answerTools.feedbackWrong);
  const canChallenge = Boolean(answerTools.challengeLabel && answerTools.challengePrompt);
  if (!canRate && !canChallenge) return null;

  async function rate(rating: "helpful" | "wrong") {
    setState("sending");
    try {
      const res = await fetch("/api/v1/guide/feedback", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ rating, question, answer, page: window.location.pathname }),
      });
      setState(res.ok ? "sent" : "failed");
    } catch {
      setState("failed");
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {canRate &&
        (state === "sent" ? (
          <span role="status" className="text-line text-[11px]">
            {answerTools.feedbackThanks}
          </span>
        ) : (
          <>
            <button type="button" className={cn(button)} disabled={state === "sending"} onClick={() => rate("helpful")}>
              <ThumbsUp aria-hidden="true" className="size-3" /> {answerTools.feedbackHelpful}
            </button>
            <button type="button" className={cn(button)} disabled={state === "sending"} onClick={() => rate("wrong")}>
              <ThumbsDown aria-hidden="true" className="size-3" /> {answerTools.feedbackWrong}
            </button>
          </>
        ))}
      {canChallenge && (
        <button type="button" className={cn(button)} disabled={busy} onClick={() => send(answerTools.challengePrompt!)}>
          <ShieldQuestion aria-hidden="true" className="size-3" /> {answerTools.challengeLabel}
        </button>
      )}
    </div>
  );
}
