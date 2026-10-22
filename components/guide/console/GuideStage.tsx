// components/guide/console/GuideStage.tsx
// The guide's identity and its state (docs/AI-GUIDE-PHASE1-PLAN.md §8). GuideMark is
// the site's own K-S cube mark, still, with the guide's state on it — a status dot,
// and a turning ring while it works — wherever the guide is shown: the home band's
// card, the console header, the docked panel elsewhere, the "still answering"
// button. It replaced the illustrated character on the owner's choice
// (2026-10-22, D-043: "go ahead with the brand mark"); the large desktop portrait
// (GuideStage) went with the home band's rebuild.

"use client";

import { CubeMark } from "@/components/shared/BrandMark";
import { useGuide } from "@/components/guide/GuideProvider";
import { useGuideChat } from "@/components/guide/GuideChatProvider";
import type { OrbMode } from "@/components/ui/thinking-orb";
import type { StepKind } from "@/lib/guide/trail";
import { cn } from "@/lib/utils";

const ORB: Partial<Record<StepKind, OrbMode>> = { search: "search", systems: "search", journey: "search", skills: "search", pulse: "search", compare: "search", fit: "search", tour: "navigate", navigate: "navigate", compose: "compose" };

/** What the guide is doing, in a few words — from the chat's real state. */
export function useGuideStatus() {
  const { ready } = useGuide();
  const { busy, working, activity } = useGuideChat();
  const label = activity?.label ?? (working ? "Thinking" : busy ? "Answering" : ready ? "Online · answers from this site's live data" : "Resting right now");
  const mode: OrbMode = (activity && ORB[activity.kind]) || "think";
  return { label, mode, busy, working };
}

export function GuideMark({ className }: { className?: string }) {
  const { busy } = useGuideChat();
  const { ready } = useGuide();
  return (
    <span className={cn("relative inline-block shrink-0", className)}>
      <CubeMark spin={false} className="size-full ring-1 ring-white/12" />
      {busy && <span aria-hidden="true" className="border-ember/70 absolute -inset-1 rounded-[32%] border-2 border-t-transparent motion-safe:animate-spin" />}
      <span
        aria-hidden="true"
        className={cn("ring-night absolute -right-0.5 -bottom-0.5 size-3 rounded-full ring-2", busy ? "bg-ember motion-safe:animate-pulse" : ready ? "bg-[var(--color-signal-finished-on-dark)]" : "bg-line")}
      />
    </span>
  );
}
