// components/guide/console/GuideStage.tsx
// The character at work (docs/AI-GUIDE-PHASE1-PLAN.md §8). GuideBust is the
// live rig — the same body as the hero — cropped to the head and shoulders, so
// it thinks, speaks and follows the visitor wherever it's shown: the home band's
// card and console header, the panel's header elsewhere. (The large desktop
// portrait, GuideStage, was removed with the home band's rebuild — D-043.)

"use client";

import { GuideCharacter } from "@/components/guide/GuideCharacter";
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

export function GuideBust({ className, ring = true }: { className?: string; ring?: boolean }) {
  const { busy } = useGuideChat();
  const { ready } = useGuide();
  return (
    <span className={cn("relative inline-block shrink-0", className)}>
      <span className={cn("bg-night-deep absolute inset-0 overflow-hidden rounded-full", ring && "ring-1 ring-white/15")}>
        <GuideCharacter className="absolute top-[-6%] left-1/2 w-[235%] -translate-x-1/2" />
      </span>
      {busy && <span aria-hidden="true" className="border-ember/70 absolute -inset-1 rounded-full border-2 border-t-transparent motion-safe:animate-spin" />}
      <span
        aria-hidden="true"
        className={cn("ring-night absolute -right-0.5 -bottom-0.5 size-3 rounded-full ring-2", busy ? "bg-ember motion-safe:animate-pulse" : ready ? "bg-[var(--color-signal-finished-on-dark)]" : "bg-line")}
      />
    </span>
  );
}
