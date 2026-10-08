// components/guide/GuideCharacter.tsx
// The AI guide's body on the page (PUBLIC-REDESIGN-PLAN §3a). The static
// master image renders first — the page never waits for the rig — then the
// WebGL rig takes over once it has loaded. It holds one still pose (owner,
// 2026-10-08: no pose changes) and turns its head and eyes toward the pointer,
// and toward wherever the visitor clicks or taps — on a phone, a tap or a drag
// (even one that scrolls the page) is how it gets looked at. It renders only while visible and holds still for
// prefers-reduced-motion. Decorative for assistive tech: the chat is the
// accessible interface.

"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { createRig, lookFrom, type Rig } from "@/components/guide/rig";
import { useGuide } from "@/components/guide/GuideProvider";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { cn } from "@/lib/utils";

const MASTER = "/character/guide-master.webp";

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
  const { registerRig, mood, setHeroInView } = useGuide();
  const reducedMotion = usePrefersReducedMotion();
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const rigRef = useRef<Rig | null>(null);
  const img = useRef<HTMLImageElement>(null);
  const [ready, setReady] = useState(false);

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
        unregister = registerRig(r, () => box.current?.getBoundingClientRect() ?? null);
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

  // Follow the visitor: the head and eyes turn toward the pointer as it moves,
  // and turn deliberately toward a click or a tap anywhere on the page.
  useEffect(() => {
    if (!ready || reducedMotion) return;
    const lookAt = (e: { clientX: number; clientY: number }, glance: boolean) => {
      const el = box.current;
      if (!el) return;
      const [x, y] = lookFrom(el.getBoundingClientRect(), e.clientX, e.clientY);
      rigRef.current?.setLook(x, y, glance);
      if (mood === "idle") rigRef.current?.setMood("attentive");
    };
    const onMove = (e: PointerEvent) => e.isPrimary && lookAt(e, false);
    const onDown = (e: PointerEvent) => e.isPrimary && lookAt(e, true);
    // On a phone a drag scrolls the page, which cancels pointer events — follow the finger anyway.
    const onTouch = (e: TouchEvent) => e.touches[0] && lookAt(e.touches[0], false);
    const onLeave = () => {
      if (mood === "idle") rigRef.current?.setMood("idle");
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("touchmove", onTouch);
      document.removeEventListener("pointerleave", onLeave);
    };
  }, [ready, reducedMotion, mood]);

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
          ready ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  );
}
