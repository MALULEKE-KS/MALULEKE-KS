// components/guide/GuideCharacter.tsx
// The AI guide's body on the page (PUBLIC-REDESIGN-PLAN §3a). The static
// master image renders first — the page never waits for the rig — then the
// WebGL rig takes over once it has loaded. It follows the pointer while the
// visitor is near, renders only while visible, and holds still for
// prefers-reduced-motion. Pose frames (wave, point) cross-fade over the rig
// for a moment when the guide greets or shows something. Decorative for
// assistive tech: the chat is the accessible interface.

"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { createRig, type Rig } from "@/components/guide/rig";
import { useGuide } from "@/components/guide/GuideProvider";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils";

const MASTER = "/character/guide-master.webp";
const POSES = {
  wave: "/character/guide-wave.webp",
  point: "/character/guide-point.webp",
  thinking: "/character/guide-thinking.webp",
} as const;

export function GuideCharacter({
  className,
  priority = false,
  reportInView = false,
}: {
  className?: string;
  priority?: boolean;
  /** The hero instance tells the provider when it is on screen, so the docked launcher steps aside. */
  reportInView?: boolean;
}) {
  const { registerRig, mood, pose, setHeroInView } = useGuide();
  const reducedMotion = usePrefersReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const rigRef = useRef<Rig | null>(null);
  const img = useRef<HTMLImageElement>(null);
  const [ready, setReady] = useState(false);
  // Poses load on first use or once the page is idle — not with the first view (spec WP-102).
  const [posesWanted, setPosesWanted] = useState(false);

  // Build the rig once the page is interactive; keep the static image if WebGL2 isn't there.
  useEffect(() => {
    let cancelled = false;
    let rig: Rig | null = null;
    let unregister: (() => void) | null = null;
    const start = () => {
      if (!canvas.current) return;
      // The rig's texture is the image the page already downloaded (its chosen size, from the
      // browser cache) — never a second, full-size copy of the master (spec WP-102: 116 KB saved).
      const texture = img.current?.currentSrc || MASTER;
      void createRig(canvas.current, texture, reducedMotion).then((r) => {
        if (cancelled || !r) return;
        rig = r;
        rigRef.current = r;
        r.setMood(mood);
        unregister = registerRig(r);
        setReady(true);
        r.setRunning(document.visibilityState === "visible");
      });
    };
    const hasIdle = typeof window.requestIdleCallback === "function";
    const idle = hasIdle ? window.requestIdleCallback(start) : window.setTimeout(start, 200);
    return () => {
      cancelled = true;
      if (hasIdle) window.cancelIdleCallback(idle);
      else window.clearTimeout(idle);
      unregister?.();
      rig?.destroy();
      rigRef.current = null;
    };
    // The rig is built once per mount; mood changes are pushed through the provider.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reducedMotion]);

  // The hero character reports whether it is on screen (independent of the rig loading).
  useEffect(() => {
    if (!reportInView || !box.current) return;
    const io = new IntersectionObserver(([entry]) => setHeroInView(!!entry?.isIntersecting), {
      threshold: 0.25,
    });
    io.observe(box.current);
    return () => {
      io.disconnect();
      setHeroInView(false);
    };
  }, [reportInView, setHeroInView]);

  // Render only while on screen and the tab is visible.
  useEffect(() => {
    if (!ready || !box.current) return;
    let onScreen = true;
    const update = () =>
      rigRef.current?.setRunning(onScreen && document.visibilityState === "visible");
    const io = new IntersectionObserver(([entry]) => {
      onScreen = !!entry?.isIntersecting;
      update();
    });
    io.observe(box.current);
    document.addEventListener("visibilitychange", update);
    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", update);
    };
  }, [ready]);

  // Follow the pointer: head and eyes turn toward it, most strongly when it's near.
  useEffect(() => {
    if (!ready || reducedMotion) return;
    const onMove = (e: PointerEvent) => {
      const el = box.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height * 0.18; // the face, not the middle of the body
      // Up and down count as much as left and right: the vertical span is the face-to-screen-edge distance.
      rigRef.current?.setLook(
        (e.clientX - cx) / (r.width * 1.1),
        (e.clientY - cy) / Math.max(r.height * 0.45, 160)
      );
      if (mood === "idle") rigRef.current?.setMood("attentive");
    };
    const onLeave = () => {
      if (mood === "idle") rigRef.current?.setMood("idle");
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, [ready, reducedMotion, mood]);

  // A flashed pose (wave, point) wins; otherwise the thinking frame shows for as long as the guide is thinking.
  const shown: keyof typeof POSES | null = reducedMotion
    ? null
    : pose !== "none"
      ? pose
      : mood === "thinking"
        ? "thinking"
        : null;
  const posing = shown !== null;
  useEffect(() => {
    if (reducedMotion || posesWanted) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- a pose is needed now; mount the frames
    if (shown) return setPosesWanted(true);
    const t = window.setTimeout(() => setPosesWanted(true), 6000);
    return () => window.clearTimeout(t);
  }, [shown, posesWanted, reducedMotion]);

  return (
    <div
      ref={box}
      aria-hidden="true"
      className={cn("relative aspect-[2/3] select-none", className)}
    >
      <Image
        ref={img}
        src={MASTER}
        alt=""
        fill
        priority={priority}
        sizes="(min-width: 1024px) 420px, 60vw"
        className={cn(
          "object-contain transition-opacity duration-500",
          ready ? "opacity-0" : "opacity-100"
        )}
      />
      <canvas
        ref={canvas}
        className={cn(
          "absolute inset-0 size-full transition-opacity duration-300",
          ready && !posing ? "opacity-100" : "opacity-0"
        )}
      />
      {posesWanted &&
        (Object.keys(POSES) as (keyof typeof POSES)[]).map((key) => (
          <Image
            key={key}
            src={POSES[key]}
            alt=""
            fill
            sizes="(min-width: 1024px) 420px, 60vw"
            className={cn(
              "object-contain transition-opacity duration-300",
              shown === key ? "opacity-100" : "opacity-0"
            )}
          />
        ))}
    </div>
  );
}
