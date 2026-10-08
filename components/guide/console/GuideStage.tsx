// components/guide/console/GuideStage.tsx
// The character at work (docs/AI-GUIDE-PHASE1-PLAN.md §8). GuideBust is the
// live rig — the same body as the hero — cropped to the head and shoulders, so
// it thinks, speaks and follows the visitor wherever it's shown: the console's
// header on a phone, the panel's header elsewhere. GuideStage is the desktop
// home console's left side: the character large, lit while it works, with what
// it's doing right now written under it — taken from the real step, never a timer.

"use client";

import { GuideCharacter } from "@/components/guide/GuideCharacter";
import { useGuide } from "@/components/guide/GuideProvider";
import { useGuideChat } from "@/components/guide/GuideChatProvider";
import { AnimatedShinyText } from "@/components/ui/animated-shiny-text";
import { ShineBorder } from "@/components/ui/shine-border";
import { ThinkingOrb, type OrbMode } from "@/components/ui/thinking-orb";
import type { StepKind } from "@/lib/guide/trail";
import { cn } from "@/lib/utils";

const ORB: Partial<Record<StepKind, OrbMode>> = { search: "search", systems: "search", journey: "search", skills: "search", pulse: "search", navigate: "navigate", compose: "compose" };

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

export function GuideStage({ className }: { className?: string }) {
  const { ownerFirstName } = useGuide();
  const { label, mode, busy, working } = useGuideStatus();
  return (
    <div className={cn("relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-night/80", className)}>
      {busy && <ShineBorder borderWidth={1.5} duration={6} shineColor={["#FF5B1F", "#FFB547", "#6082AA"]} />}
      {/* The stage: an ember glow that brightens while the guide works. */}
      <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0 transition-opacity duration-700", busy ? "opacity-100" : "opacity-60")}>
        <div className="absolute inset-x-[10%] top-[8%] h-[60%] rounded-full bg-[radial-gradient(closest-side,rgb(255_91_31/0.28),transparent)] blur-2xl" />
      </div>
      <div className="relative flex-1 overflow-hidden [mask-image:linear-gradient(to_bottom,#000_70%,transparent)]">
        <GuideCharacter className="absolute top-[2%] left-1/2 w-[128%] -translate-x-1/2" />
      </div>
      <div className="relative space-y-1.5 px-5 pt-2 pb-5">
        <p className="text-paper flex items-center gap-2 text-sm font-semibold">
          {ownerFirstName}&apos;s AI guide
          <span className="border-ember/30 bg-ember/10 text-ember rounded-full border px-1.5 py-px text-[10px] font-medium tracking-wide uppercase">AI</span>
        </p>
        <p aria-live="polite" className="flex min-h-7 items-center gap-2 text-[12.5px]">
          {busy ? (
            <>
              {working && <ThinkingOrb mode={mode} size={28} className="-my-1 -ml-1" />}
              <AnimatedShinyText className="text-[12.5px]">{label}…</AnimatedShinyText>
            </>
          ) : (
            <span className="text-mist">{label}</span>
          )}
        </p>
      </div>
    </div>
  );
}
