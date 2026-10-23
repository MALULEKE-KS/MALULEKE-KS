// components/guide/console/GuideStage.tsx
// The guide's identity and its state (docs/AI-GUIDE-PHASE1-PLAN.md §8). GuideMark is
// the guide's own face — the orb (GuideBot, D-060, the owner's choice 2026-10-24),
// which draws the guide's state itself — wherever the guide is shown: the home
// band's card, the console header, the "still answering" button. It replaced the
// site's K-S mark (D-044), which is the owner's logo, not the guide's face.

"use client";

import { GuideBot } from "@/components/guide/GuideBot";
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
  // The guide's own face (D-060): its state — ready, thinking, answering, resting, off — is drawn by the orb itself.
  return <GuideBot className={cn("shrink-0", className)} />;
}
