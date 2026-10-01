// components/home/HeroGuide.tsx
// The AI guide's character in the hero (PUBLIC-REDESIGN-PLAN §3, §3a): on its
// own, on a flickering ember field, fading into the page at the bottom. The
// conversation lives in its own section below (AiGuideSection) — the owner
// wanted the AI part clearly its own, not a bubble over the character — so
// the character carries only a small nameplate that leads there.
//
// The poses (wave, point, thinking) don't wait for the chat — the character
// uses them on its own: a wave the first time in a session and when the
// visitor comes back up to it, a point down to its section while the
// nameplate is hovered or focused, and now and then, while it's on screen and
// idle, one of its poses in turn. Reduced motion shows none (GuideCharacter).

"use client";

import { useEffect, useRef } from "react";
import type { GuidePose } from "@/components/guide/GuideProvider";
import { ArrowDown, Sparkles } from "lucide-react";
import { GuideCharacter } from "@/components/guide/GuideCharacter";
import { useGuide } from "@/components/guide/GuideProvider";
import { FlickeringGrid } from "@/components/ui/flickering-grid";

const GREETED_KEY = "mks.greeted";
/** Idle poses, in turn; a pose holds POSE_MS, then the rig for the rest of the gap (ms, start to start). */
const IDLE_POSES: Exclude<GuidePose, "none">[] = ["thinking", "point", "wave"];
const IDLE_MIN = 14000;
const IDLE_JITTER = 6000;
/** Away from the hero at least this long before coming back earns a wave. */
const WELCOME_BACK_AFTER = 15000;

export function HeroGuide() {
  const { enabled, ownerFirstName, flashPose, heroInView } = useGuide();
  const leftAt = useRef<number | null>(null);

  // Now and then, while on screen and the tab is visible, one of the poses.
  useEffect(() => {
    if (!heroInView) return;
    let turn = 0;
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      timer = setTimeout(() => {
        if (document.visibilityState === "visible") flashPose(IDLE_POSES[turn++ % IDLE_POSES.length]!);
        next();
      }, IDLE_MIN + Math.random() * IDLE_JITTER);
    };
    next();
    return () => clearTimeout(timer);
  }, [heroInView, flashPose]);

  // Coming back up to the character after a while: a wave.
  useEffect(() => {
    if (!heroInView) {
      leftAt.current = Date.now();
      return;
    }
    if (leftAt.current !== null && Date.now() - leftAt.current > WELCOME_BACK_AFTER) flashPose("wave");
    leftAt.current = null;
  }, [heroInView, flashPose]);

  // Wave once per session, shortly after the page settles.
  useEffect(() => {
    let greeted = true;
    try {
      greeted = sessionStorage.getItem(GREETED_KEY) === "1";
      sessionStorage.setItem(GREETED_KEY, "1");
    } catch {
      // Storage blocked: skip the greeting rather than wave on every page view.
    }
    if (greeted) return;
    const t = setTimeout(() => flashPose("wave"), 900);
    return () => clearTimeout(t);
  }, [flashPose]);

  return (
    <div className="relative mx-auto w-full max-w-[420px] lg:max-w-none">
      {/* The stage: a soft ember disc and a flickering field that fades out at the edges. */}
      <div aria-hidden="true" className="absolute inset-x-[-10%] top-[4%] bottom-[10%] -z-10">
        <div className="absolute inset-[14%] rounded-full bg-[radial-gradient(closest-side,rgb(255_91_31/0.2),transparent)] blur-2xl" />
        <FlickeringGrid className="[mask-image:radial-gradient(ellipse_55%_50%_at_50%_42%,#000_30%,transparent_75%)]" maxOpacity={0.3} />
      </div>

      {/* The character fades into the page instead of ending on a hard edge. */}
      <div className="[mask-image:linear-gradient(to_bottom,#000_78%,transparent)]">
        <GuideCharacter priority reportInView className="mx-auto w-[min(58vw,240px)] sm:w-[320px] lg:w-full lg:max-w-[430px]" />
      </div>

      {enabled && (
        <a
          href="#ai-guide"
          onMouseEnter={() => flashPose("point")}
          onFocus={() => flashPose("point")}
          className="group border-white/12 bg-night/70 text-paper absolute bottom-[9%] left-1/2 inline-flex -translate-x-1/2 items-center gap-2 rounded-full border py-1.5 pr-3.5 pl-2.5 text-xs whitespace-nowrap shadow-[0_12px_40px_-12px_rgb(0_0_0/0.9)] backdrop-blur-xl transition-colors hover:border-ember/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ember"
        >
          <Sparkles aria-hidden="true" className="text-ember size-3.5" />
          <span>{ownerFirstName}&apos;s AI guide</span>
          <ArrowDown aria-hidden="true" className="text-mist size-3.5 transition-transform group-hover:translate-y-0.5" />
        </a>
      )}
    </div>
  );
}
