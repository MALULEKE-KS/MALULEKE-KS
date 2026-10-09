// components/guide/console/AnswerMessage.tsx
// One answer from the guide (docs/AI-GUIDE-PHASE1-PLAN.md §3): what it did
// (the trail), what it says, the live cards of what it showed, and the records
// it used (receipts) — then copy, and "continue" when an answer was cut short.

"use client";

import { useMemo } from "react";
import type { UIMessage } from "ai";
import { CopyButton } from "@/components/guide/CopyButton";
import { GuideText } from "@/components/guide/GuideText";
import { textOf, useGuideChat } from "@/components/guide/GuideChatProvider";
import { useGuide } from "@/components/guide/GuideProvider";
import { TourCard } from "@/components/guide/console/TourCard";
import { CompareCard, FitCard, JourneyCard, PulseCard, SkillCards, SystemCards } from "@/components/guide/console/AnswerCards";
import { AnswerCheck } from "@/components/guide/console/AnswerCheck";
import { AnswerFeedback } from "@/components/guide/console/AnswerFeedback";
import { Receipts } from "@/components/guide/console/Receipts";
import { WorkingTrail } from "@/components/guide/console/WorkingTrail";
import { receiptsOf } from "@/lib/guide/receipts";
import { trailOf } from "@/lib/guide/trail";
import type { CompareCardData, JourneyCardData, PulseCardData, SkillCardData, SystemCardData } from "@/lib/guide/show-tools";
import type { FitCardData } from "@/lib/guide/fit";
import type { ResolvedTour } from "@/lib/guide/tour";
import type { Verification } from "@/lib/guide/verify";

type Part = UIMessage["parts"][number] & { state?: string; output?: unknown };

/** The visitor's question an answer replies to — the nearest question before it. */
function questionFor(messages: UIMessage[], answerId: string): string {
  const at = messages.findIndex((m) => m.id === answerId);
  for (let i = at - 1; i >= 0; i--) if (messages[i]!.role === "user") return textOf(messages[i]!);
  return "";
}

export function AnswerMessage({ message, live, onNavigate }: { message: UIMessage; live: boolean; onNavigate?: () => void }) {
  const { linkHosts } = useGuide();
  const { siteIndex, thoughtFor, send, messages } = useGuideChat();
  const steps = useMemo(() => trailOf(message), [message]);
  const receipts = useMemo(() => (live ? [] : receiptsOf(message, siteIndex)), [message, siteIndex, live]);
  const text = textOf(message);
  const question = questionFor(messages, message.id);
  const meta = message.metadata as { finishReason?: string; verification?: Verification } | undefined;
  const cut = !live && meta?.finishReason === "length";

  return (
    <div className="group/answer min-w-0 space-y-3">
      <WorkingTrail steps={steps} live={live && !text} thoughtFor={thoughtFor[message.id]} />
      {message.parts.map((raw, i) => {
        const p = raw as Part;
        if (p.type === "text") return p.text.trim() ? <GuideText key={i} text={p.text} hosts={linkHosts} onNavigate={onNavigate} /> : null;
        if (p.state !== "output-available" || !p.output) return null;
        if (p.type === "tool-show_systems") return <SystemCards key={i} systems={p.output as SystemCardData[]} />;
        if (p.type === "tool-show_journey") return <JourneyCard key={i} journey={p.output as JourneyCardData} />;
        if (p.type === "tool-show_skills") return <SkillCards key={i} skills={p.output as SkillCardData[]} />;
        if (p.type === "tool-show_pulse") return <PulseCard key={i} pulse={p.output as PulseCardData} />;
        if (p.type === "tool-compare_systems") return <CompareCard key={i} compare={p.output as CompareCardData} />;
        if (p.type === "tool-fit_check") return <FitCard key={i} fit={p.output as FitCardData} />;
        if (p.type === "tool-start_tour") return <TourCard key={i} id={(p as { toolCallId?: string }).toolCallId ?? `tour-${i}`} tour={p.output as ResolvedTour} onNavigate={onNavigate} />;
        return null;
      })}
      {!live && <AnswerCheck verification={meta?.verification} />}
      {cut && (
        <p className="text-mist text-[11px]">
          That answer ran long and was cut short —{" "}
          <button type="button" onClick={() => send("Please continue where you left off.")} className="text-ember underline underline-offset-2">
            continue
          </button>
        </p>
      )}
      {!live && text.trim() && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.06] pt-2.5">
          <Receipts receipts={receipts} />
          <CopyButton text={text} label="Copy answer" className="opacity-70 transition-opacity group-hover/answer:opacity-100 focus-visible:opacity-100" />
        </div>
      )}
      {!live && text.trim() && question && <AnswerFeedback question={question} answer={text} />}
    </div>
  );
}
